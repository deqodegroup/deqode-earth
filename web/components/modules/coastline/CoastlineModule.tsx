"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { type Location } from "@/lib/locations";
import { MetricCards, type CoastlineMetrics } from "./MetricCards";

// Leaflet must not run on the server
const CoastlineMap = dynamic(
  () => import("./CoastlineMap").then((m) => ({ default: m.CoastlineMap })),
  { ssr: false }
);

const ANALYSIS_STEPS = [
  "Connecting",
  "Fetching Sentinel-2",
  "Computing changes",
  "Generating results",
];

function daysAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatCoord(val: number, isLat: boolean): string {
  const abs = Math.abs(val).toFixed(3);
  const dir = isLat ? (val >= 0 ? "N" : "S") : (val >= 0 ? "E" : "W");
  return `${abs}°${dir}`;
}

function bboxZoom(lonRange: number): number {
  if (lonRange < 0.25) return 12;
  if (lonRange < 0.5)  return 11;
  if (lonRange < 1.0)  return 10;
  return 9;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; data: CoastlineMetrics }
  | { status: "error"; message: string };

type ThumbState = "idle" | "loading" | "done" | "error";

const cacheKey = (slug: string) => `deqode-earth-${slug}-coastline`;

export function CoastlineModule({ loc }: { loc: Location }) {
  const [state, setState]         = useState<AnalysisState>({ status: "idle" });
  const [thumbState, setThumbState] = useState<ThumbState>("idle");
  const [tileUrl, setTileUrl] = useState<string | undefined>(undefined);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [lastRun, setLastRun]     = useState<number | null>(null);
  const [copied, setCopied]       = useState(false);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Map centre + zoom derived from bbox
  const lonRange = loc.bbox[2] - loc.bbox[0];
  const latRange = loc.bbox[3] - loc.bbox[1];
  const mapCenter: [number, number] = [
    (loc.bbox[1] + loc.bbox[3]) / 2,
    (loc.bbox[0] + loc.bbox[2]) / 2,
  ];
  const mapZoom = bboxZoom(lonRange);

  // Restore cached result on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey(loc.slug));
      if (raw) {
        const cached: { data: CoastlineMetrics; timestamp: number } = JSON.parse(raw);
        setState({ status: "done", data: cached.data });
        setLastRun(cached.timestamp);
      }
    } catch {}
  }, [loc.slug]);

  function clearStepTimers() {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }

  async function runAnalysis() {
    clearStepTimers();
    setState({ status: "running" });
    setAnalysisStep(0);
    setTileUrl(undefined);
    setThumbState("idle");

    stepTimers.current = [
      setTimeout(() => setAnalysisStep(1), 4000),
      setTimeout(() => setAnalysisStep(2), 14000),
      setTimeout(() => setAnalysisStep(3), 28000),
    ];

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: loc.slug }),
      });
      clearStepTimers();
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed — try again" }));
        setState({ status: "error", message: err.error ?? "Analysis failed" });
        return;
      }
      const data: CoastlineMetrics = await res.json();
      const now = Date.now();
      setState({ status: "done", data });
      setLastRun(now);

      try {
        localStorage.setItem(cacheKey(loc.slug), JSON.stringify({ data, timestamp: now }));
      } catch {}

      // Fetch change overlay in the background
      setThumbState("loading");
      fetch("/api/map-thumb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: loc.slug }),
      })
        .then((r) => r.json())
        .then((r) => {
          if (r.tileUrl) {
            setTileUrl(r.tileUrl);
            setThumbState("done");
          } else {
            setThumbState("error");
          }
        })
        .catch(() => setThumbState("error"));
    } catch {
      clearStepTimers();
      setState({ status: "error", message: "Network error — check your connection" });
    }
  }

  async function downloadReport(format: "pdf" | "txt") {
    if (state.status !== "done") return;
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: loc.slug, format, metrics: state.data }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deqode-earth-${loc.slug}-coastline.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function getInterpretation(data: CoastlineMetrics): string {
    const erosionHa = (data.erosion_m2 / 10_000).toFixed(2);
    const accretionHa = (data.accretion_m2 / 10_000).toFixed(2);
    if (data.net_change_m < -1) {
      return `${loc.name} is losing ground. The coastline has retreated an average of ${Math.abs(data.net_change_m).toFixed(1)} m since baseline — ${erosionHa} ha of land lost. Immediate monitoring and intervention planning is recommended.`;
    }
    if (data.net_change_m > 1) {
      return `${loc.name}'s coastline is building outward. An average of ${data.net_change_m.toFixed(1)} m of new shoreline has formed since baseline — ${accretionHa} ha gained. Sediment dynamics are broadly stable with localised deposition.`;
    }
    return `No significant coastline change detected. ${loc.name}'s shoreline is holding stable — ${data.stable_pct.toFixed(0)}% classified as stable between baseline and current period. Continue regular monitoring.`;
  }

  const sw = `${formatCoord(loc.bbox[1], true)}, ${formatCoord(loc.bbox[0], false)}`;
  const ne = `${formatCoord(loc.bbox[3], true)}, ${formatCoord(loc.bbox[2], false)}`;

  return (
    <div className="space-y-6">

      {/* Command panel — mission brief + run control */}
      <div className="rounded-lg border border-[var(--border)] bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-6 px-5 py-4 flex-wrap">
          {/* Mission parameters */}
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { label: "Baseline", value: "2019" },
              { label: "Current",  value: "2024" },
              { label: "Sensor",   value: "Sentinel-2" },
              { label: "Scale",    value: "30 m" },
              { label: "Index",    value: "NDWI" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">{label}</div>
                <div className="font-mono text-sm text-[var(--text)]">{value}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {state.status === "done" && (
              <>
                <button
                  onClick={() => downloadReport("txt")}
                  className="font-mono text-[0.65rem] tracking-[0.1em] uppercase
                             px-3 py-2 rounded border border-[var(--border)]
                             text-[var(--text-dim)] hover:border-teal hover:text-teal transition-colors"
                >
                  TXT
                </button>
                <button
                  onClick={() => downloadReport("pdf")}
                  className="font-mono text-[0.65rem] tracking-[0.1em] uppercase
                             px-3 py-2 rounded border border-gold/30
                             text-gold hover:bg-gold/10 transition-colors"
                >
                  PDF
                </button>
              </>
            )}
            <button
              onClick={runAnalysis}
              disabled={state.status === "running"}
              className="font-mono text-xs tracking-[0.12em] uppercase
                         px-6 py-2.5 rounded bg-teal text-ocean font-semibold
                         hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors animate-glow-teal"
            >
              {state.status === "running" ? "Analysing…" : state.status === "done" ? "Run Again" : "Run Analysis"}
            </button>
          </div>
        </div>

        {/* Status bar */}
        {state.status === "done" && lastRun !== null && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2 bg-surface2/40">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
              <span className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)]">
                Last analysed {daysAgo(lastRun)}
              </span>
            </div>
            <button
              onClick={copyShareLink}
              className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors"
            >
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        )}
      </div>

      {/* Data spec table */}
      <div className="rounded-lg border border-[var(--border)] bg-surface overflow-hidden">
        <button
          onClick={() => setSpecsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-surface2 transition-colors"
        >
          <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Data Specifications
          </span>
          <span className="font-mono text-xs text-[var(--text-dim)] select-none">{specsOpen ? "▲" : "▼"}</span>
        </button>
        {specsOpen && (
          <div className="border-t border-[var(--border)]">
            {[
              ["Sensor",       "Sentinel-2 MSI (ESA Copernicus)"],
              ["Bands",        "B3 Green + B8 NIR — NDWI water index"],
              ["Cloud filter", "< 10% cloud cover per scene"],
              ["Baseline",     "2019 — annual median composite"],
              ["Current",      "2024 — annual median composite"],
              ["Resolution",   "30 m analysis scale"],
              ["Water index",  "NDWI > 0.1 = water  ·  ≤ 0.1 = land"],
              ["Platform",     "Google Earth Engine"],
              ["Territory",    `${loc.name} · ${loc.coords}`],
              ["EEZ",          loc.eez],
            ].map(([label, value], i) => (
              <div key={label}
                   className={`flex items-baseline gap-4 px-5 py-2.5 ${i % 2 === 0 ? "bg-surface2/20" : ""}`}>
                <span className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-[var(--text-dim)] w-28 flex-shrink-0">
                  {label}
                </span>
                <span className="font-mono text-[0.7rem] text-[var(--text-mid)]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive satellite map — always visible, edge-to-edge */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: "#0D1B2A" }}>

        {/* Map container — Leaflet renders here */}
        <div className="relative">
          <CoastlineMap
            center={mapCenter}
            zoom={mapZoom}
            tileUrl={tileUrl}
          />

          {/* HUD — always visible legend top-right, stats top-left after analysis */}

          {/* Legend — always on map */}
          <div className="absolute top-3 right-3 z-[1000]">
            <div className="bg-[#0D1B2A]/88 backdrop-blur-md rounded-lg px-3 py-2.5 border border-white/10 flex flex-col gap-1.5">
              <div className="font-mono text-[0.58rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Change Layer</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#E05B4B] flex-shrink-0" />
                <span className="font-mono text-[0.65rem] text-[var(--text-mid)]">Erosion</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#4CB9C0] flex-shrink-0" />
                <span className="font-mono text-[0.65rem] text-[var(--text-mid)]">Accretion</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1e3a5f] flex-shrink-0" />
                <span className="font-mono text-[0.65rem] text-[var(--text-mid)]">Stable land</span>
              </div>
            </div>
          </div>

          {/* Stats HUD — appears after analysis */}
          {state.status === "done" && (
            <>
              {/* Top-left: dominant net change + supporting metrics */}
              <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
                {/* Primary — net change, largest element */}
                <div className="bg-[#0D1B2A]/92 backdrop-blur-md rounded-lg px-4 py-3 border border-white/10"
                     style={{ borderLeftWidth: "2px", borderLeftColor: state.data.net_change_m < -1 ? "#E05B4B" : state.data.net_change_m > 1 ? "#4CB9C0" : "rgba(255,255,255,0.15)" }}>
                  <div className="font-mono text-[0.58rem] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-1">Net Shoreline Change</div>
                  <div className={`font-mono text-2xl font-semibold leading-none tracking-tight ${state.data.net_change_m < -1 ? "text-[#E05B4B]" : state.data.net_change_m > 1 ? "text-[#4CB9C0]" : "text-white"}`}>
                    {state.data.net_change_m > 0 ? "+" : ""}{state.data.net_change_m.toFixed(1)}<span className="text-sm font-normal ml-1 opacity-60">m</span>
                  </div>
                </div>

                {/* Secondary — land lost / gained side by side */}
                <div className="flex gap-2">
                  <div className="bg-[#0D1B2A]/88 backdrop-blur-md rounded-lg px-3 py-2 border border-[#E05B4B]/25 flex-1">
                    <div className="font-mono text-[0.55rem] tracking-[0.15em] uppercase text-[var(--text-dim)] mb-0.5">Lost</div>
                    <div className="font-mono text-sm font-semibold text-[#E05B4B] leading-none">
                      {(state.data.erosion_m2 / 10_000).toFixed(2)}<span className="text-[0.6rem] font-normal ml-0.5 opacity-70">ha</span>
                    </div>
                  </div>
                  <div className="bg-[#0D1B2A]/88 backdrop-blur-md rounded-lg px-3 py-2 border border-[#4CB9C0]/25 flex-1">
                    <div className="font-mono text-[0.55rem] tracking-[0.15em] uppercase text-[var(--text-dim)] mb-0.5">Gained</div>
                    <div className="font-mono text-sm font-semibold text-[#4CB9C0] leading-none">
                      {(state.data.accretion_m2 / 10_000).toFixed(2)}<span className="text-[0.6rem] font-normal ml-0.5 opacity-70">ha</span>
                    </div>
                  </div>
                </div>

                {/* Tertiary — stable */}
                <div className="bg-[#0D1B2A]/80 backdrop-blur-md rounded-lg px-3 py-2 border border-white/8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[0.58rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">Stable coast</span>
                    <span className="font-mono text-sm font-semibold text-white">{state.data.stable_pct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Sensor badge — bottom left, above attribution */}
              <div className="absolute bottom-10 left-3 z-[1000]">
                <div className="bg-[#0D1B2A]/75 backdrop-blur-sm rounded px-2.5 py-1.5 flex items-center gap-2 border border-white/8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4CB9C0] animate-pulse" />
                  <span className="font-mono text-[0.58rem] tracking-[0.1em] uppercase text-[var(--text-dim)]">
                    S2 · NDWI · 30 m · GEE · {state.data.period_start}–{state.data.period_end}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Status toasts — centred bottom */}
          {thumbState === "loading" && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000]
                            bg-[#0D1B2A]/90 backdrop-blur-md rounded-full px-5 py-2 flex items-center gap-2.5 border border-[#4CB9C0]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4CB9C0] animate-pulse" />
              <span className="font-mono text-xs tracking-[0.14em] uppercase text-[#4CB9C0]">
                Rendering change overlay…
              </span>
            </div>
          )}

          {state.status === "idle" && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000]
                            bg-[#0D1B2A]/80 backdrop-blur-md rounded-full px-5 py-2 border border-white/10">
              <span className="font-mono text-xs tracking-[0.1em] uppercase text-[var(--text-dim)]">
                Run Analysis to overlay coastal change data
              </span>
            </div>
          )}

          {thumbState === "error" && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1000]
                            bg-[#0D1B2A]/90 backdrop-blur-md rounded-full px-5 py-2 border border-[#E05B4B]/25">
              <span className="font-mono text-xs tracking-[0.1em] uppercase text-[#E05B4B]">
                Change overlay failed — metrics below are unaffected
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-end" style={{ background: "rgba(13,27,42,0.6)" }}>
          <span className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-dim)]">
            SW {sw} · NE {ne}
          </span>
        </div>
      </div>

      {/* Analysis running — full mission scan UI */}
      {state.status === "running" && (
        <div className="rounded-lg border border-teal/25 bg-surface overflow-hidden relative">
          <div className="scan-line" />
          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-30"
               style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(76,185,192,0.05) 0px, rgba(76,185,192,0.05) 1px, transparent 1px, transparent 60px)" }} />

          <div className="relative px-8 py-10">
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className="relative flex items-center justify-center w-3 h-3">
                <span className="absolute w-5 h-5 rounded-full bg-teal/20 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-teal" />
              </span>
              <span className="font-mono text-xs tracking-[0.25em] uppercase text-teal">
                Querying Google Earth Engine
              </span>
            </div>

            {/* Step pipeline */}
            <div className="flex items-center justify-center gap-0 max-w-lg mx-auto mb-8">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded flex items-center justify-center border transition-all duration-500
                                    ${i < analysisStep
                                      ? "bg-teal/20 border-teal/50"
                                      : i === analysisStep
                                      ? "bg-teal/10 border-teal animate-pulse"
                                      : "bg-surface2 border-[var(--border)]"}`}>
                      <span className={`font-mono text-[0.6rem] font-bold
                                        ${i < analysisStep ? "text-teal" : i === analysisStep ? "text-teal" : "text-[var(--border)]"}`}>
                        {i < analysisStep ? "✓" : String(i + 1)}
                      </span>
                    </div>
                    <span className={`font-mono text-[0.58rem] tracking-[0.08em] uppercase text-center
                                      ${i === analysisStep ? "text-teal" : i < analysisStep ? "text-[var(--text-dim)]" : "text-[var(--border)]"}`}>
                      {step}
                    </span>
                  </div>
                  {i < ANALYSIS_STEPS.length - 1 && (
                    <div className={`h-px w-6 mb-5 flex-shrink-0 transition-all duration-500 ${i < analysisStep ? "bg-teal/50" : "bg-[var(--border)]"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs mx-auto h-px bg-surface2 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal/60 to-teal rounded"
                   style={{
                     width: `${((analysisStep + 0.5) / ANALYSIS_STEPS.length) * 100}%`,
                     transition: "width 0.8s ease-out",
                     boxShadow: "0 0 8px rgba(76,185,192,0.6)"
                   }} />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state.status === "error" && (
        <div className="rounded-lg border border-coral/30 bg-coral/5 px-6 py-4">
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-coral mb-1">
            Analysis Failed
          </div>
          <div className="font-sans text-sm text-[var(--text-mid)]">{state.message}</div>
        </div>
      )}

      {/* Metrics + interpretation */}
      {state.status === "done" && (
        <div className="space-y-4">
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Results · Baseline {state.data.period_start} · Current {state.data.period_end}
          </div>
          <MetricCards data={state.data} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Intelligence assessment — pull quote style */}
            <div className="lg:col-span-2 rounded-lg border border-[var(--border)] bg-surface overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5"
                   style={{ background: state.data.net_change_m < -1 ? "#E05B4B" : state.data.net_change_m > 1 ? "#4CB9C0" : "rgba(74,102,128,0.5)" }} />
              <div className="px-6 py-5">
                <div className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
                  Intelligence Assessment
                </div>
                <p className="font-sans text-base text-[var(--text)] leading-relaxed font-light">
                  {getInterpretation(state.data)}
                </p>
              </div>
            </div>

            {/* Boundary + share */}
            <div className="rounded-lg border border-[var(--border)] bg-surface px-5 py-4 flex flex-col justify-between gap-4">
              <div>
                <div className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
                  Analysis Boundary
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.6rem] text-[var(--text-dim)]">SW</span>
                    <span className="font-mono text-[0.65rem] text-[var(--text-mid)]">{sw}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.6rem] text-[var(--text-dim)]">NE</span>
                    <span className="font-mono text-[0.65rem] text-[var(--text-mid)]">{ne}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={copyShareLink}
                className="font-mono text-[0.65rem] tracking-[0.1em] uppercase px-3 py-2.5 rounded
                           border border-[var(--border)] text-[var(--text-dim)]
                           hover:border-teal hover:text-teal transition-colors w-full"
              >
                {copied ? "Copied!" : "Share Results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
