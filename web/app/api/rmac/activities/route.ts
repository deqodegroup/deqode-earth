import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRmacUser } from "@/lib/rmac/auth";
import {
  RMAC_EVIDENCE_BUCKET,
  RMAC_ORG_SLUG,
  RMAC_REVIEW_ROLES,
  RMAC_VILLAGE_SLUG,
} from "@/lib/rmac/constants";
import { validateRmacSubmission } from "@/lib/rmac/validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function referenceCode(id: string, activityDate: string) {
  return `AS-${activityDate.replaceAll("-", "")}-${id.slice(0, 8).toUpperCase()}`;
}

function serverError(message: string, correlationId: string) {
  return NextResponse.json(
    { error: `${message} Reference: ${correlationId}` },
    { status: 500 }
  );
}

export async function GET() {
  const correlationId = crypto.randomUUID();
  const auth = await requireRmacUser();
  if (auth instanceof NextResponse) return auth;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("rmac_activities")
    .select(
      "id, reference_code, created_by, activity_date, action_area, description, people_count, people_notes, spend_nzd, latitude, longitude, location_name, location_accuracy_m, visibility, status, review_notes, submitted_at, reviewed_at, rmac_activity_evidence(id, original_name, storage_path)"
    )
    .eq("org_slug", RMAC_ORG_SLUG)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("RMAC activity list failed", { correlationId, error });
    return serverError("Activities are temporarily unavailable.", correlationId);
  }

  const activities = await Promise.all(
    (data ?? []).map(async (activity) => {
      const evidence = await Promise.all(
        (activity.rmac_activity_evidence ?? []).map(async (item) => {
          const { data: signed } = await admin.storage
            .from(RMAC_EVIDENCE_BUCKET)
            .createSignedUrl(item.storage_path, 900);
          return {
            id: item.id,
            originalName: item.original_name,
            url: signed?.signedUrl ?? null,
          };
        })
      );
      return { ...activity, rmac_activity_evidence: evidence };
    })
  );

  const canReview = RMAC_REVIEW_ROLES.includes(auth.profile.role);
  return NextResponse.json({
    activities: canReview
      ? activities
      : activities.map((activity) => ({
          ...activity,
          spend_nzd:
            activity.created_by === auth.user.id ? activity.spend_nzd : null,
          can_resubmit:
            activity.status === "returned" && activity.created_by === auth.user.id,
        })),
  });
}

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const auth = await requireRmacUser();
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid activity submission." }, { status: 400 });
  }

  const validation = validateRmacSubmission(formData);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { value, files } = validation;
  const admin = createSupabaseAdminClient();
  const correctionId = String(formData.get("activityId") ?? "");
  const isCorrection = correctionId.length > 0;
  if (isCorrection && !UUID_PATTERN.test(correctionId)) {
    return NextResponse.json({ error: "Invalid activity ID." }, { status: 400 });
  }

  const activityId = isCorrection ? correctionId : crypto.randomUUID();
  let reference = referenceCode(activityId, value.activityDate);
  let existingPhotoConsent = false;
  const uploadedPaths: string[] = [];
  const evidenceIds: string[] = [];

  if (isCorrection) {
    const { data: existing, error: lookupError } = await admin
      .from("rmac_activities")
      .select("id, reference_code, photo_consent_confirmed")
      .eq("id", activityId)
      .eq("org_slug", RMAC_ORG_SLUG)
      .eq("created_by", auth.user.id)
      .eq("status", "returned")
      .single();

    if (lookupError || !existing) {
      return NextResponse.json(
        { error: "Only your returned activities can be corrected." },
        { status: 404 }
      );
    }
    reference = existing.reference_code;
    existingPhotoConsent = existing.photo_consent_confirmed;
  } else {
    const { error: insertError } = await admin.from("rmac_activities").insert({
      id: activityId,
      reference_code: reference,
      org_slug: RMAC_ORG_SLUG,
      village_slug: RMAC_VILLAGE_SLUG,
      created_by: auth.user.id,
      activity_date: value.activityDate,
      action_area: value.actionArea,
      description: value.description,
      people_count: value.peopleCount,
      people_notes: value.peopleNotes,
      spend_nzd: value.spendNzd,
      latitude: value.latitude,
      longitude: value.longitude,
      location_name: value.locationName,
      location_accuracy_m: value.locationAccuracyM,
      visibility: value.visibility,
      photo_consent_confirmed: value.photoConsentConfirmed,
      status: "pending",
    });

    if (insertError) {
      console.error("RMAC activity insert failed", { correlationId, insertError });
      return serverError("The activity could not be saved.", correlationId);
    }
  }

  try {
    for (const file of files) {
      const extension =
        file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const evidenceId = crypto.randomUUID();
      const path = `${RMAC_ORG_SLUG}/${activityId}/${evidenceId}.${extension}`;
      const bytes = await file.arrayBuffer();
      const { error: uploadError } = await admin.storage
        .from(RMAC_EVIDENCE_BUCKET)
        .upload(path, bytes, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);

      const { error: evidenceError } = await admin.from("rmac_activity_evidence").insert({
        id: evidenceId,
        activity_id: activityId,
        storage_path: path,
        original_name: file.name.slice(0, 255),
        mime_type: file.type,
        size_bytes: file.size,
        created_by: auth.user.id,
      });
      if (evidenceError) throw evidenceError;
      evidenceIds.push(evidenceId);
    }

    if (isCorrection) {
      const { error: updateError } = await admin
        .from("rmac_activities")
        .update({
          activity_date: value.activityDate,
          action_area: value.actionArea,
          description: value.description,
          people_count: value.peopleCount,
          people_notes: value.peopleNotes,
          spend_nzd: value.spendNzd,
          latitude: value.latitude,
          longitude: value.longitude,
          location_name: value.locationName,
          location_accuracy_m: value.locationAccuracyM,
          visibility: value.visibility,
          photo_consent_confirmed:
            existingPhotoConsent || value.photoConsentConfirmed,
          status: "pending",
          review_notes: null,
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq("id", activityId)
        .eq("org_slug", RMAC_ORG_SLUG)
        .eq("created_by", auth.user.id)
        .eq("status", "returned");
      if (updateError) throw updateError;
    }

    const { error: auditError } = await admin.from("rmac_activity_audit").insert({
      activity_id: activityId,
      actor_id: auth.user.id,
      action: isCorrection ? "resubmitted" : "submitted",
      detail: { evidence_count: files.length },
    });
    if (auditError) throw auditError;
  } catch (error) {
    console.error("RMAC evidence save failed", { correlationId, error });
    if (uploadedPaths.length) {
      await admin.storage.from(RMAC_EVIDENCE_BUCKET).remove(uploadedPaths);
    }
    if (evidenceIds.length) {
      await admin.from("rmac_activity_evidence").delete().in("id", evidenceIds);
    }
    if (!isCorrection) {
      await admin.from("rmac_activities").delete().eq("id", activityId);
    }
    return serverError("Evidence upload failed. Nothing was submitted.", correlationId);
  }

  return NextResponse.json(
    { id: activityId, referenceCode: reference, status: "pending" },
    { status: isCorrection ? 200 : 201 }
  );
}
