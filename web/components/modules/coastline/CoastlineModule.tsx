"use client";

import { useState, useEffect, useRef } from "react";
import { type Location } from "@/lib/locations";
import { MetricCards, type CoastlineMetrics } from "./MetricCards";

function FullscreenMap({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 font-mono text-xs tracking-[0.1em] uppercase
                   text-[var(--text-dim)] hover:text-white border border-[var(--border)]
                   hover:border-white px-3 py-1.5 rounded transition-colors"
      >
        Close
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

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

type AnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; data: CoastlineMetrics }
  | { status: "error"; message: string };

type ThumbState = "idle" | "loading" | "done" | "error";

const cacheKey = (slug: string) => `deqode-earth-${slug}-coastline`;

export function CoastlineModule({ loc }: { loc: Location }) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbState, setThumbState] = useState<ThumbState>("idle");
  const [mapImageUrl, setMapImageUrl] = useState("");
  const [specsOpen, setSpecsOpen] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    setMapImageUrl("");
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

      setThumbState("loading");
      fetch("/api/map-thumb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: loc.slug }),
      })
        .then((r) => r.json())
        .then((r) => {
          if (r.mapImageUrl) { setMapImageUrl(r.mapImageUrl); setThumbState("done"); }
          else setThumbState("error");
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
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)] mb-1">
            Analysis Window
          </div>
          <div className="font-sans text-sm text-[var(--text-mid)]">
            2019–2020 baseline · 2023–2025 current · Sentinel-2 optical · 30 m
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {state.status === "done" && (
            <>
              <button
                onClick={() => downloadReport("txt")}
                className="font-mono text-xs tracking-[0.1em] uppercase
                           px-4 py-2 rounded border border-[var(--border)]
                           text-[var(--text-mid)] hover:border-teal hover:text-teal transition-colors"
              >
                Export TXT
              </button>
              <button
                onClick={() => downloadReport("pdf")}
                className="font-mono text-xs tracking-[0.1em] uppercase
                           px-4 py-2 rounded border border-gold/30
                           text-gold hover:bg-gold/10 transition-colors"
              >
                Export PDF
              </button>
            </>
          )}

          <button
            onClick={runAnalysis}
            disabled={state.status === "running"}
            className="font-mono text-xs tracking-[0.1em] uppercase
                       px-5 py-2.5 rounded bg-teal text-ocean font-medium
                       hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors animate-glow-teal"
          >
            {state.status === "running" ? "Analysing…" : state.status === "done" ? "Run Again" : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Cached result banner */}
      {state.status === "done" && lastRun !== null && (
        <div className="flex items-center justify-between rounded border border-[var(--border)] bg-surface/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            <span className="font-mono text-xs tracking-[0.08em] text-[var(--text-dim)]">
              Last analysed {daysAgo(lastRun)}
            </span>
          </div>
          <button
            onClick={copyShareLink}
            className="font-mono text-xs tracking-[0.08em] uppercase text-[var(--text-dim)]
                       hover:text-teal transition-colors"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}

      {/* Data spec table — collapsed by default */}
      <div className="rounded-lg border border-[var(--border)] bg-surface overflow-hidden">
        <button
          onClick={() => setSpecsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-surface2 transition-colors"
        >
          <span className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Data Specifications
          </span>
          <span className="font-mono text-xs text-[var(--text-dim)] select-none">
            {specsOpen ? "▲" : "▼"}
          </span>
        </button>
        {specsOpen && (
          <table className="w-full text-sm border-t border-[var(--border)]">
            <tbody>
              {[
                ["Sensor",        "Sentinel-2 MSI (ESA Copernicus)"],
                ["Bands",         "B3 Green + B8 NIR — NDWI water index"],
                ["Cloud filter",  "< 20% cloud cover per scene"],
                ["Baseline",      "2019 – 2020 (2-year median composite)"],
                ["Current",       "2023 – 2025 (2-year median composite)"],
                ["Resolution",    "30 m analysis scale"],
                ["Water index",   "NDWI > 0 = water, ≤ 0 = land"],
                ["Platform",      "Google Earth Engine"],
                ["Territory",     `${loc.name} · ${loc.coords}`],
                ["EEZ",           loc.eez],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3 font-mono text-xs tracking-[0.08em] uppercase text-[var(--text-dim)] w-36">
                    {label}
                  </td>
                  <td className="px-5 py-3 text-[var(--text-mid)]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Analysis running — step indicator */}
      {state.status === "running" && (
        <div className="rounded-lg border border-teal/20 bg-teal/5 px-6 py-8">
          <div className="font-mono text-xs tracking-[0.2em] uppercase text-teal mb-6 text-center">
            Querying Google Earth Engine
          </div>
          <div className="flex items-start justify-between max-w-sm mx-auto gap-2">
            {ANALYSIS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-2 flex-1">
                <div className={`rounded-full transition-all duration-500
                                 ${i < analysisStep
                                   ? "w-2 h-2 bg-teal"
                                   : i === analysisStep
                                   ? "w-2.5 h-2.5 bg-teal animate-pulse"
                                   : "w-2 h-2 bg-surface2"}`} />
                <div className={`font-mono text-[0.65rem] tracking-[0.06em] text-center leading-tight
                                 ${i === analysisStep ? "text-teal" : i < analysisStep ? "text-[var(--text-dim)]" : "text-[var(--border)]"}`}>
                  {step}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 w-40 mx-auto h-0.5 bg-surface2 rounded overflow-hidden">
            <div className="h-full bg-teal rounded w-1/2" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
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

      {/* Results */}
      {state.status === "done" && (
        <div className="space-y-4">
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Results · Baseline {state.data.period_start} · Current {state.data.period_end}
          </div>
          <MetricCards data={state.data} />

          {/* Coordinates + share */}
          <div className="rounded-lg border border-[var(--border)] bg-surface px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-xs tracking-[0.12em] uppercase text-[var(--text-dim)] mb-1">
                Analysis Boundary
              </div>
              <div className="font-mono text-xs text-[var(--text-mid)]">
                SW {sw} · NE {ne}
              </div>
            </div>
            <button
              onClick={copyShareLink}
              className="font-mono text-xs tracking-[0.08em] uppercase px-3 py-1.5 rounded
                         border border-[var(--border)] text-[var(--text-dim)]
                         hover:border-teal hover:text-teal transition-colors"
            >
              {copied ? "Copied!" : "Share Results"}
            </button>
          </div>

          {/* Satellite change map */}
          {thumbState !== "idle" && (
            <>
              {fullscreen && mapImageUrl && (
                <FullscreenMap
                  url={mapImageUrl}
                  alt={`${loc.name} coastline change`}
                  onClose={() => setFullscreen(false)}
                />
              )}
              <div className="rounded-lg border border-[var(--border)] bg-surface overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)]">
                    Sentinel-2 Coastal Change Map
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 font-mono text-xs tracking-[0.1em] uppercase">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E05B4B]" />
                        <span className="text-[var(--text-dim)]">Erosion</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4CB9C0]" />
                        <span className="text-[var(--text-dim)]">Accretion</span>
                      </span>
                    </div>
                    {mapImageUrl && (
                      <button
                        onClick={() => setFullscreen(true)}
                        className="font-mono text-xs tracking-[0.1em] uppercase
                                   px-2.5 py-1 rounded border border-[var(--border)]
                                   text-[var(--text-dim)] hover:border-teal hover:text-teal transition-colors"
                      >
                        Fullscreen
                      </button>
                    )}
                  </div>
                </div>

                {thumbState === "loading" && (
                  <div className="px-6 py-10 text-center">
                    <div className="font-mono text-xs tracking-[0.2em] uppercase text-teal mb-2">
                      Rendering Change Map
                    </div>
                    <div className="font-sans text-sm text-[var(--text-dim)]">
                      Generating satellite change image…
                    </div>
                    <div className="mt-4 w-40 mx-auto h-0.5 bg-surface2 rounded overflow-hidden">
                      <div className="h-full bg-teal rounded w-1/2" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                  </div>
                )}

                {thumbState === "done" && mapImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={mapImageUrl}
                    alt={`${loc.name} coastline change`}
                    className="w-full block cursor-zoom-in"
                    onClick={() => setFullscreen(true)}
                  />
                )}

                {thumbState === "error" && (
                  <div className="px-6 py-6 text-center font-sans text-sm text-[var(--text-dim)]">
                    Map image unavailable — metrics above are unaffected.
                  </div>
                )}

                <div className="px-5 py-2 border-t border-[var(--border)]">
                  <span className="font-mono text-[0.65rem] tracking-[0.08em] uppercase text-[var(--text-dim)]">
                    Sentinel-2 MSI · NDWI water index · 30 m resolution · Google Earth Engine
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Interpretation — plain English */}
          <div className="rounded-lg border border-[var(--border)] bg-surface p-5"
               style={{ borderLeftColor: "rgba(76,185,192,0.45)", borderLeftWidth: "2px" }}>
            <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)] mb-2">
              What This Means
            </div>
            <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
              {getInterpretation(state.data)}
            </p>
          </div>
        </div>
      )}

      {/* Idle */}
      {state.status === "idle" && (
        <div className="rounded-lg border border-[var(--border)] bg-surface/50 px-6 py-10 text-center">
          <div className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--text-dim)] mb-2">
            Ready to Analyse
          </div>
          <p className="font-sans text-sm text-[var(--text-dim)] max-w-sm mx-auto">
            Click "Run Analysis" to query the Sentinel-2 optical archive via
            Google Earth Engine and compute shoreline change metrics.
          </p>
        </div>
      )}
    </div>
  );
}
