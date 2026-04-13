import { NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * Proxy GEE thumbnail URLs to avoid browser CORS restrictions.
 * Usage: GET /api/map-image?url=<encoded-gee-url>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  // Only proxy earthengine.googleapis.com URLs
  if (!url.startsWith("https://earthengine.googleapis.com/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
