import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRmacUser } from "@/lib/rmac/auth";
import { RMAC_EVIDENCE_BUCKET, RMAC_ORG_SLUG } from "@/lib/rmac/constants";
import {
  buildRmacInsights,
  type RmacInsightActivity,
} from "@/lib/rmac/insights";

export async function GET() {
  const correlationId = crypto.randomUUID();
  const auth = await requireRmacUser();
  if (auth instanceof NextResponse) return auth;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("rmac_activities")
    .select(
      "id, reference_code, activity_date, action_area, description, people_count, spend_nzd, latitude, longitude, location_name, reviewed_at, rmac_activity_evidence(id, original_name, storage_path)"
    )
    .eq("org_slug", RMAC_ORG_SLUG)
    .eq("status", "approved")
    .order("activity_date", { ascending: false });

  if (error) {
    console.error("RMAC insights query failed", { correlationId, error });
    return NextResponse.json(
      { error: `Approved reporting is temporarily unavailable. Reference: ${correlationId}` },
      { status: 500 }
    );
  }

  const activities: RmacInsightActivity[] = await Promise.all(
    (data ?? []).map(async (activity) => ({
      id: activity.id,
      referenceCode: activity.reference_code,
      activityDate: activity.activity_date,
      actionArea: activity.action_area,
      description: activity.description,
      peopleCount: activity.people_count,
      spendNzd: activity.spend_nzd === null ? null : Number(activity.spend_nzd),
      latitude: activity.latitude === null ? null : Number(activity.latitude),
      longitude: activity.longitude === null ? null : Number(activity.longitude),
      locationName: activity.location_name,
      reviewedAt: activity.reviewed_at,
      evidence: await Promise.all(
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
      ),
    }))
  );

  return NextResponse.json(buildRmacInsights(activities));
}
