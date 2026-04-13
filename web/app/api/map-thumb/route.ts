import { NextResponse } from "next/server";
import { initGEE } from "@/lib/gee/auth";
import { generateMapThumb } from "@/lib/gee/coastline";
import { LOCATIONS } from "@/lib/locations";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { slug?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const loc = LOCATIONS[body.slug ?? ""];
  if (!loc) return NextResponse.json({ error: "Unknown location" }, { status: 404 });

  try {
    await initGEE();
    const rawUrl = await generateMapThumb(loc);
    const mapImageUrl = `/api/map-image?url=${encodeURIComponent(rawUrl)}`;
    return NextResponse.json({ mapImageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    console.error("[map-thumb] GEE error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
