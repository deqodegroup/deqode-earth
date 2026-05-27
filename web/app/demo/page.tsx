import Link from "next/link";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";

export const dynamic = "force-static";

const DEMO_STEPS = [
  {
    step: 1,
    title: "Open Command Center",
    url: "/",
    action:
      "Open the homepage. Verify: Asia-Pacific map loads (zoom 4, centred ~10°N 145°E). RegionTree visible left. StatusStrip shows '10 Regions' and 'COPRRRA Demo Mode' badge.",
    failsafe:
      "If map is blank: hard refresh (Ctrl+Shift+R). ArcGIS tiles load from CDN — need WiFi.",
    preWarm: false,
  },
  {
    step: 2,
    title: "Click Tuvalu",
    url: "/?region=tuvalu",
    action:
      "Click 'Tuvalu' in RegionTree. Verify: IntelligencePanel slides in right with Tuvalu data. Map flies to Tuvalu (zoom 13, 8°31'S 179°13'E). Displaced count and flood depth load within 2s.",
    failsafe:
      "If IntelligencePanel shows 'Loading…' after 3s: data is still warm — proceed. Score falls back to 87.",
    preWarm: false,
  },
  {
    step: 3,
    title: "Click COASTLINE tab",
    url: "/region/tuvalu/coastline",
    action:
      "In IntelligencePanel, click 'Coastline' module tab. Verify: CoastlineModule loads with cached analysis result. 'Last analysed X days ago' shows in status bar — no spinner.",
    failsafe:
      "If no cache (spinner shows): click 'Run Analysis' and wait 45-90s. This is the highest demo risk. PRE-WARM NIGHT BEFORE.",
    preWarm: true,
    preWarmInstructions:
      "The night before COPRRRA: 1) Open /region/tuvalu/coastline in the DEMO BROWSER. 2) Click 'Run Analysis'. 3) Wait for completion (~60s). 4) Verify 'Last analysed 0 days ago' shows. 5) Do NOT clear browser storage.",
  },
  {
    step: 4,
    title: "Click Brisbane",
    url: "/?region=brisbane",
    action:
      "Navigate back to /. Click 'Brisbane Flood Zones' in RegionTree. Verify: IntelligencePanel switches to Brisbane data. Map flies to Brisbane (zoom 11, 27°28'S 153°01'E).",
    failsafe:
      "If panel shows stale Tuvalu data: click Brisbane again. URL should show ?region=brisbane.",
    preWarm: false,
  },
  {
    step: 5,
    title: "Compare with Brisbane",
    url: "/compare/tuvalu/brisbane",
    action:
      "In IntelligencePanel (Brisbane selected), the Compare CTA reads 'Compare with Brisbane →'. Click it — OR navigate directly to /compare/tuvalu/brisbane. Verify: Two-panel compare view. Left: Tuvalu displacement + coastline. Right: Brisbane flood risk.",
    failsafe:
      "If compare page is slow: both panels are Supabase reads, <200ms. Hard refresh if blank.",
    preWarm: false,
  },
  {
    step: 6,
    title: "Grantham Case Study",
    url: "/cases/grantham",
    action:
      "Navigate to /cases/grantham (direct URL or via Grantham in RegionTree → 'View Case Study →' in panel). Verify: Case study page loads with QRA stats, timeline, flood map, COPRRRA context block.",
    failsafe:
      "If flood map is empty: static page still works — note 'Flood extent data loading' message is intentional fallback. All other content is hardcoded.",
    preWarm: false,
  },
];

export default function DemoPage() {
  const preWarmSteps = DEMO_STEPS.filter((s) => s.preWarm);

  return (
    <div className="flex flex-col bg-ocean" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main
        className="flex-1"
        style={{
          paddingTop: "var(--bar-height)",
          paddingBottom: "var(--strip-height)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-coral border border-coral/30 rounded px-2 py-0.5">
                INTERNAL
              </span>
              <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-gold border border-gold/30 rounded px-2 py-0.5">
                COPRRRA 2 SEP 2026
              </span>
            </div>
            <h1 className="font-syne text-3xl font-semibold text-[var(--text)]">
              Demo Checklist
            </h1>
            <p className="font-sans text-sm text-[var(--text-mid)] mt-1">
              6-minute flow · Open this page in a second tab during the
              presentation
            </p>
          </div>

          {/* Pre-warm alert */}
          {preWarmSteps.length > 0 && (
            <div className="bg-gold/5 border border-gold/30 rounded p-5 mb-8">
              <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-gold mb-3">
                Pre-Warm Required (Night Before)
              </div>
              {preWarmSteps.map((s) => (
                <div key={s.step}>
                  <p className="font-mono text-[0.6rem] tracking-[0.08em] text-[var(--text-mid)] font-semibold mb-1">
                    Step {s.step}: {s.title}
                  </p>
                  <p className="font-sans text-sm text-[var(--text-mid)]">
                    {s.preWarmInstructions}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Demo steps */}
          <div className="space-y-4">
            {DEMO_STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-surface/60 border border-[var(--border)] rounded p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="font-syne text-2xl font-semibold text-teal/40 flex-shrink-0 w-8">
                    {s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-syne text-sm font-semibold text-[var(--text)]">
                        {s.title}
                      </span>
                      <Link
                        href={s.url}
                        className="font-mono text-[0.55rem] tracking-[0.1em] text-teal hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.url} ↗
                      </Link>
                      {s.preWarm && (
                        <span className="font-mono text-[0.5rem] tracking-[0.15em] uppercase text-gold border border-gold/30 rounded px-1.5 py-0.5">
                          Pre-warm required
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-sm text-[var(--text-mid)] mb-2">
                      {s.action}
                    </p>
                    <p className="font-mono text-[0.55rem] tracking-[0.08em] text-coral/70">
                      If this fails: {s.failsafe}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* URLs quick reference */}
          <div className="mt-8 bg-surface/40 border border-[var(--border)] rounded p-5">
            <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
              Quick URL Reference
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                "/",
                "/?region=tuvalu",
                "/region/tuvalu/coastline",
                "/?region=brisbane",
                "/compare/tuvalu/brisbane",
                "/cases/grantham",
              ].map((url) => (
                <Link
                  key={url}
                  href={url}
                  className="font-mono text-[0.55rem] tracking-[0.08em] text-teal hover:underline truncate"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {url}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <StatusStrip demoMode />
    </div>
  );
}
