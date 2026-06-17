import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRmacUser } from "@/lib/rmac/auth";
import { RMAC_ORG_SLUG, RMAC_REVIEW_ROLES } from "@/lib/rmac/constants";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serverError(message: string, correlationId: string) {
  return NextResponse.json(
    { error: `${message} Reference: ${correlationId}` },
    { status: 500 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = crypto.randomUUID();
  const auth = await requireRmacUser();
  if (auth instanceof NextResponse) return auth;
  if (!RMAC_REVIEW_ROLES.includes(auth.profile.role)) {
    return NextResponse.json({ error: "Reviewer access required." }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid activity ID." }, { status: 400 });
  }

  let body: { status?: string; reviewNotes?: string };
  try {
    body = (await request.json()) as { status?: string; reviewNotes?: string };
  } catch {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  if (!body.status || !["approved", "returned"].includes(body.status)) {
    return NextResponse.json({ error: "Select approve or return." }, { status: 400 });
  }
  const reviewNotes = String(body.reviewNotes ?? "").trim();
  if (body.status === "returned" && reviewNotes.length < 5) {
    return NextResponse.json(
      { error: "Explain what needs to be corrected before returning the activity." },
      { status: 400 }
    );
  }
  if (reviewNotes.length > 1000) {
    return NextResponse.json({ error: "Review notes must be 1,000 characters or fewer." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: activity, error: lookupError } = await admin
    .from("rmac_activities")
    .select("id, status")
    .eq("id", id)
    .eq("org_slug", RMAC_ORG_SLUG)
    .single();

  if (lookupError || !activity) {
    return NextResponse.json({ error: "Activity not found." }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("rmac_activities")
    .update({
      status: body.status,
      review_notes: reviewNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    })
    .eq("id", id)
    .eq("org_slug", RMAC_ORG_SLUG);

  if (updateError) {
    console.error("RMAC review update failed", { correlationId, updateError });
    return serverError("The review could not be saved.", correlationId);
  }

  const { error: auditError } = await admin.from("rmac_activity_audit").insert({
    activity_id: id,
    actor_id: auth.user.id,
    action: body.status,
    detail: { notes: reviewNotes || null, previous_status: activity.status },
  });
  if (auditError) {
    console.error("RMAC review audit failed", { correlationId, auditError, activityId: id });
    return serverError(
      "The review was saved, but its audit record needs attention.",
      correlationId
    );
  }

  return NextResponse.json({ success: true, status: body.status });
}
