import { NextResponse } from "next/server";
import { getRegion } from "@/lib/regions";
import { initGEE } from "@/lib/gee/auth";
import { analyseCoastline } from "@/lib/gee/coastline";

export const runtime = "nodejs";
export const maxDuration = 120;

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
        { error: "Coastline analysis is available for Pacific SIDS only", correlationId },
        { status: 400 }
      );
    }

    await initGEE();
    const metrics = await analyseCoastline(region);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("coastline analysis failed", { correlationId, error });

    return NextResponse.json(
      { error: "Analysis failed", correlationId },
      { status: 500 }
    );
  }
}
