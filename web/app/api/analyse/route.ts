import { NextResponse } from "next/server";
import { initGEE } from "@/lib/gee/auth";
import { analyseCoastline } from "@/lib/gee/coastline";
import { LOCATIONS } from "@/lib/locations";

export const maxDuration = 120; // seconds — GEE requests can be slow

export async function POST(req: Request) {
  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug } = body;
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const loc = LOCATIONS[slug];
  if (!loc) {
    return NextResponse.json({ error: `Unknown location: ${slug}` }, { status: 404 });
  }
  if (!loc.isLive) {
    return NextResponse.json({ error: `${loc.name} is not yet live` }, { status: 403 });
  }

  try {
    await initGEE();
    const metrics = await analyseCoastline(loc);
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
