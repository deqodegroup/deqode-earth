import { NextResponse } from "next/server";
import { LOCATIONS } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

export const maxDuration = 60;

interface ReportBody {
  slug:    string;
  format:  "pdf" | "txt";
  metrics: CoastlineMetrics;
}

function buildTxt(slug: string, metrics: CoastlineMetrics): string {
  const loc = LOCATIONS[slug]!;
  const now = new Date().toISOString().split("T")[0];

  return [
    "DEQODE EARTH — SOVEREIGN INTELLIGENCE",
    "Coastline Change Analysis Report",
    "=".repeat(50),
    "",
    `Territory      : ${loc.name} (${loc.flag})`,
    `Coordinates    : ${loc.coords}`,
    `EEZ            : ${loc.eez}`,
    `Risk Level     : ${loc.risk}`,
    `Analysis Period: ${metrics.period_start} – ${metrics.period_end}`,
    `Report Date    : ${now}`,
    "",
    "METRICS",
    "-".repeat(30),
    `Coastal Erosion   : ${metrics.erosion_m} m`,
    `Coastal Accretion : ${metrics.accretion_m} m`,
    `Net Change        : ${metrics.net_change_m > 0 ? "+" : ""}${metrics.net_change_m} m`,
    `Stable Shoreline  : ${metrics.stable_pct}%`,
    "",
    "DATA SOURCES",
    "-".repeat(30),
    "Sensor  : Sentinel-1 SAR (ESA Copernicus)",
    "Band    : VV polarisation, IW mode",
    "Pass    : Ascending",
    "Platform: Google Earth Engine",
    "",
    "CLASSIFICATION: SOVEREIGN",
    "Not for public distribution.",
    "© 2026 DEQODE Group — All intelligence is satellite-verified",
  ].join("\n");
}

async function buildPdf(slug: string, metrics: CoastlineMetrics): Promise<Buffer> {
  // Dynamic import — puppeteer is only needed at runtime on the server.
  const puppeteer = await import("puppeteer").then((m) => m.default ?? m);
  const loc = LOCATIONS[slug]!;
  const now = new Date().toISOString().split("T")[0];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Playfair+Display+SC:wght@400;700&family=DM+Sans:wght@400;500;600&display=swap');
  :root {
    --ocean:#0D1B2A; --surface:#152236; --teal:#4CB9C0;
    --gold:#D4A55A; --coral:#E05B4B; --text:#E8EDF2;
    --text-mid:#8BA5BC; --text-dim:#4A6680;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--ocean); color: var(--text); font-family: 'DM Sans', sans-serif;
         padding: 48px; font-size: 12px; }
  .header { border-bottom: 1px solid rgba(76,185,192,0.15); padding-bottom: 24px; margin-bottom: 32px; }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.3em;
             text-transform: uppercase; color: var(--teal); margin-bottom: 8px; }
  h1 { font-family: 'Playfair Display SC', serif; font-size: 28px; color: var(--text); margin-bottom: 4px; }
  .subtitle { color: var(--text-mid); font-size: 11px; }
  .meta { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 32px; }
  .meta-item label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 0.15em;
                     text-transform: uppercase; color: var(--text-dim); display: block; margin-bottom: 4px; }
  .meta-item span { font-size: 11px; color: var(--text-mid); font-weight: 500; }
  .metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 32px; }
  .metric-card { background: var(--surface); border: 1px solid rgba(76,185,192,0.10);
                 border-radius: 8px; padding: 16px; }
  .metric-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 0.14em;
                  text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; }
  .metric-value { font-family: 'Playfair Display SC', serif; font-size: 24px; }
  .metric-value.negative { color: var(--coral); }
  .metric-value.positive { color: var(--teal); }
  .metric-value.neutral  { color: var(--text); }
  .metric-unit { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-dim); margin-left: 2px; }
  .section-title { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 0.2em;
                   text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; }
  .sources { background: var(--surface); border: 1px solid rgba(76,185,192,0.10);
             border-radius: 8px; padding: 16px; display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; }
  .source-row { display: flex; gap: 8px; }
  .source-row label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 0.1em;
                      text-transform: uppercase; color: var(--text-dim); width: 56px; flex-shrink: 0; }
  .source-row span { color: var(--text-mid); font-size: 11px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid rgba(76,185,192,0.10);
            display: flex; justify-content: space-between; }
  .footer span { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 0.1em;
                 text-transform: uppercase; color: var(--text-dim); }
</style>
</head>
<body>
<div class="header">
  <div class="eyebrow">DEQODE GROUP · Sovereign Intelligence</div>
  <h1>Coastline Intelligence</h1>
  <div class="subtitle">${loc.flag} ${loc.name} · Shoreline Change Analysis ${metrics.period_start}–${metrics.period_end}</div>
</div>

<div class="meta">
  <div class="meta-item"><label>Territory</label><span>${loc.name}</span></div>
  <div class="meta-item"><label>Coordinates</label><span>${loc.coords}</span></div>
  <div class="meta-item"><label>EEZ Area</label><span>${loc.eez}</span></div>
  <div class="meta-item"><label>Risk Level</label><span>${loc.risk}</span></div>
  <div class="meta-item"><label>Analysis Period</label><span>${metrics.period_start} – ${metrics.period_end}</span></div>
  <div class="meta-item"><label>Report Date</label><span>${now}</span></div>
</div>

<div class="section-title">Shoreline Change Metrics</div>
<div class="metrics">
  <div class="metric-card">
    <div class="metric-label">Coastal Erosion</div>
    <div class="metric-value negative">${metrics.erosion_m}<span class="metric-unit">m</span></div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Coastal Accretion</div>
    <div class="metric-value positive">${metrics.accretion_m}<span class="metric-unit">m</span></div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Net Change</div>
    <div class="metric-value ${metrics.net_change_m >= 0 ? "positive" : "negative"}">
      ${metrics.net_change_m > 0 ? "+" : ""}${metrics.net_change_m}<span class="metric-unit">m</span>
    </div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Stable Shoreline</div>
    <div class="metric-value neutral">${metrics.stable_pct}<span class="metric-unit">%</span></div>
  </div>
</div>

<div class="section-title">Data Sources</div>
<div class="sources">
  <div class="source-row"><label>Sensor</label><span>Sentinel-1 SAR (ESA Copernicus)</span></div>
  <div class="source-row"><label>Band</label><span>VV polarisation, IW mode</span></div>
  <div class="source-row"><label>Pass</label><span>Ascending orbit</span></div>
  <div class="source-row"><label>Platform</label><span>Google Earth Engine</span></div>
</div>

<div class="footer">
  <span>Classification: SOVEREIGN · Not for public distribution</span>
  <span>© 2026 DEQODE Group — All intelligence is satellite-verified</span>
</div>
</body>
</html>`;

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function POST(req: Request) {
  let body: Partial<ReportBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, format, metrics } = body;
  if (!slug || !format || !metrics) {
    return NextResponse.json({ error: "slug, format, and metrics are required" }, { status: 400 });
  }
  if (!LOCATIONS[slug]) {
    return NextResponse.json({ error: `Unknown location: ${slug}` }, { status: 404 });
  }

  try {
    if (format === "txt") {
      const txt = buildTxt(slug, metrics);
      return new Response(txt, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="deqode-earth-${slug}-coastline.txt"`,
        },
      });
    }

    const pdfBuf = await buildPdf(slug, metrics);
    return new Response(new Uint8Array(pdfBuf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="deqode-earth-${slug}-coastline.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
