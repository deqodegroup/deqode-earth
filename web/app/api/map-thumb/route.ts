import { NextResponse } from "next/server";
import { getRegion } from "@/lib/regions";
import { initGEE } from "@/lib/gee/auth";
import { generateChangeTileUrl } from "@/lib/gee/coastline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();

  try {
    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug : "";
    const region = getRegion(slug);

    if (!slug) {
      return NextResponse.json({ error: "slug is required", correlationId }, { status: 400 });
    }

    if (!region) {
      return NextResponse.json({ error: "Unknown region", correlationId }, { status: 400 });
    }

    if (region.regionType !== "sids") {
      return NextResponse.json(
        { error: "Coastline map overlay is available for Pacific SIDS only", correlationId },
        { status: 400 }
      );
    }

    await initGEE();
    const { tileUrl, bounds } = await generateChangeTileUrl(region);

    return NextResponse.json({ tileUrl, bounds });
  } catch (error) {
    console.error("coastline map overlay failed", { correlationId, error });

    return NextResponse.json(
      { error: "Map overlay generation failed", correlationId },
      { status: 500 }
    );
  }
}
