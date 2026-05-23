import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat") ?? "-27.47";
  const lng = searchParams.get("lng") ?? "153.02";
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("flood_forecasts")
    .select("forecast_date, discharge_m3s, source, scenario")
    .eq("source", "open_meteo")
    .gte("forecast_date", cutoff.toISOString().split("T")[0])
    .order("forecast_date", { ascending: true })
    .limit(130); // 92 forecast days + 30 past days + buffer

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    source: "open_meteo",
    timeseries: data ?? [],
  });
}
