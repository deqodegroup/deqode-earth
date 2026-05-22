import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const bbox = searchParams.get("bbox");

  if (!bbox) {
    return NextResponse.json(
      { error: "bbox required (minx,miny,maxx,maxy)" },
      { status: 400 }
    );
  }

  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return NextResponse.json(
      { error: "bbox must be 4 comma-separated numbers" },
      { status: 400 }
    );
  }
  const [p_minx, p_miny, p_maxx, p_maxy] = parts;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("flood_zones_in_bbox", {
    p_minx,
    p_miny,
    p_maxx,
    p_maxy,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  return NextResponse.json({
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      geometry: null, // geometry returned as WKB — wire ST_AsGeoJSON in a future iteration
      properties: {
        source: row.source,
        flood_class: row.flood_class,
        annual_recurrence_interval: row.annual_recurrence_interval,
        council: row.council,
        region_slug: row.region_slug,
        data_date: row.data_date,
      },
    })),
  });
}
