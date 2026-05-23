import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const region = searchParams.get("region");
  const returnPeriod = searchParams.get("return_period");
  const scenario = searchParams.get("scenario");

  if (!region) {
    return NextResponse.json({ error: "region required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Brisbane / Grantham: JRC GloFAS depth from analysis_cache
  if ((region === "brisbane" || region === "grantham") && returnPeriod) {
    const { data, error } = await supabase
      .from("analysis_cache")
      .select("result, completed_at, status")
      .eq("region_slug", region)
      .eq("analysis_type", "flood_depth")
      .eq("status", "complete")
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as { result: Record<string, unknown>; completed_at: string }[];
    const rp = parseInt(returnPeriod, 10);
    const match = rows.find((row) => {
      const result = row.result as { return_period?: number } | null;
      return result?.return_period === rp;
    });

    if (!match) {
      return NextResponse.json(
        { error: "No GloFAS data for this return period" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      region,
      depth_m: match.result.depth_m,
      return_period: match.result.return_period,
      source: match.result.source ?? "jrc_glofas",
      computed_at: match.completed_at,
    });
  }

  // Pacific SIDS: Deltares coastal depth from flood_forecasts
  const { data, error } = await supabase
    .from("flood_forecasts")
    .select("coastal_depth_m, scenario, forecast_date, source")
    .eq("source", "deltares")
    .order("forecast_date", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const forecastRows = (data ?? []) as Record<string, unknown>[];
  const scenarioFilter = scenario ?? "current";
  const match = forecastRows.find((row) => row.scenario === scenarioFilter);

  if (!match) {
    return NextResponse.json(
      { error: "No Deltares data for this scenario" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    region,
    depth_m: match.coastal_depth_m,
    source: "deltares",
    scenario: match.scenario,
    as_of: match.forecast_date,
  });
}
