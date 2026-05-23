import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
  const { data, error } = await supabase.rpc("flood_zones_geojson_in_bbox", {
    p_minx,
    p_miny,
    p_maxx,
    p_maxy,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
