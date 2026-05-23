import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { REGION_LIST } from "@/lib/regions";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseAdminClient();

  // Aggregate total displaced per country from event-level records
  const { data: displacementData } = await supabase
    .from("displacement_records")
    .select("country_code, displaced_count")
    .eq("data_type", "event")
    .order("year", { ascending: false });

  const displacementByCountry: Record<string, number> = {};
  for (const row of (displacementData ?? []) as { country_code: string; displaced_count: number | null }[]) {
    const cc = row.country_code;
    displacementByCountry[cc] =
      (displacementByCountry[cc] ?? 0) + (row.displaced_count ?? 0);
  }

  const regions = REGION_LIST.map((r) => ({
    slug: r.slug,
    name: r.name,
    flag: r.flag,
    regionType: r.regionType,
    subRegion: r.subRegion,
    risk: r.risk,
    isLive: r.isLive,
    pop: r.pop,
    bbox: r.bbox,
    center: r.center,
    zoom: r.zoom,
    // Displacement summary (null if no data yet)
    total_displaced: displacementByCountry[r.slug.toUpperCase()] ?? null,
  }));

  return NextResponse.json({ regions });
}
