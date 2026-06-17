import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildOceanSummary, type OceanMetricRow } from "@/lib/ocean/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const region = searchParams.get("region");

  if (!region) {
    return NextResponse.json(
      { error: "region (slug) required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ocean_metrics")
    .select("metric_type, recorded_date, value, unit")
    .eq("region_slug", region)
    .order("recorded_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: OceanMetricRow[] = (data ?? []).map((r) => ({
    metricType: r.metric_type as OceanMetricRow["metricType"],
    recordedDate: r.recorded_date as string,
    value: r.value as number,
    unit: r.unit as string,
  }));

  return NextResponse.json({
    region,
    ...buildOceanSummary(rows),
  });
}
