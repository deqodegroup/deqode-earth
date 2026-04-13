"use client";

import { useState } from "react";
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

type AnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; data: CoastlineMetrics }
  | { status: "error"; message: string };

type ThumbState = "idle" | "loading" | "done" | "error";

export function CoastlineModule({ loc }: { loc: Location }) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [fullscreen, setFullscreen] = useState(false);
  const [thumbState, setThumbState] = useState<ThumbState>("idle");
  const [mapImageUrl, setMapImageUrl] = useState("");

  async function runAnalysis() {
    setState({ status: "running" });
    setMapImageUrl("");
    setThumbState("idle");
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: loc.slug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed — try again" }));
        setState({ status: "error", message: err.error ?? "Analysis failed" });
        return;
      }
      const data: CoastlineMetrics = await res.json();
      setState({ status: "done", data });

      // Load the satellite map image separately so it doesn't block the metrics
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

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)] mb-1">
            Analysis Window
          </div>
          <div className="font-sans text-sm text-[var(--text-mid)]">
            2019–2021 baseline · 2023–2025 current · Sentinel-1 SAR · 10 m
          </div>
        </div>

        <div className="flex items-center gap-3">
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
                       transition-colors"
          >
            {state.status === "running" ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Data spec table — always visible */}
      <div className="rounded-lg border border-[var(--border)] bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <span className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Data Specifications
          </span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {[
              ["Sensor",        "Sentinel-1 SAR (ESA Copernicus)"],
              ["Band",          "VV polarisation — IW mode"],
              ["Orbits",        "Ascending + Descending"],
              ["Baseline",      "2019 – 2021 (3-year median composite)"],
              ["Current",       "2023 – 2025 (3-year median composite)"],
              ["Resolution",    "10 m native"],
              ["Threshold",     "−15 dB land/water boundary"],
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
      </div>

      {/* Results */}
      {state.status === "running" && (
        <div className="rounded-lg border border-teal/20 bg-teal/5 px-6 py-8 text-center">
          <div className="font-mono text-xs tracking-[0.2em] uppercase text-teal mb-2">
            Querying Google Earth Engine
          </div>
          <div className="font-sans text-sm text-[var(--text-dim)]">
            Processing Sentinel-1 SAR imagery · This takes 20–60 seconds
          </div>
          <div className="mt-4 w-40 mx-auto h-0.5 bg-surface2 rounded overflow-hidden">
            <div className="h-full bg-teal rounded w-1/2" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-coral/30 bg-coral/5 px-6 py-4">
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-coral mb-1">
            Analysis Failed
          </div>
          <div className="font-sans text-sm text-[var(--text-mid)]">{state.message}</div>
        </div>
      )}

      {state.status === "done" && (
        <div className="space-y-4">
          <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Results · Baseline {state.data.period_start} · Current {state.data.period_end}
          </div>
          <MetricCards data={state.data} />

          {/* Satellite change map */}
          {(thumbState !== "idle") && (
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
                    Sentinel-1 SAR Change Map
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 font-mono text-[0.5rem] tracking-[0.1em] uppercase">
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
                        className="font-mono text-[0.5rem] tracking-[0.1em] uppercase
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
                      Rendering SAR Map
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
                  <span className="font-mono text-[0.45rem] tracking-[0.08em] uppercase text-[var(--text-dim)]">
                    Sentinel-1 GRD · VV polarisation · 10 m resolution · Google Earth Engine
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border border-[var(--border)] bg-surface p-5">
            <div className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--text-dim)] mb-2">
              Interpretation
            </div>
            <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
              {state.data.net_change_m < -1
                ? `${loc.name} is experiencing net coastal erosion of ${Math.abs(state.data.net_change_m).toFixed(1)} m (${(state.data.erosion_m2 / 10_000).toFixed(2)} ha) over the analysis period. Immediate monitoring and intervention planning is recommended.`
                : state.data.net_change_m > 1
                ? `${loc.name} shows net coastal accretion of ${state.data.net_change_m.toFixed(1)} m (${(state.data.accretion_m2 / 10_000).toFixed(2)} ha gained). Sediment dynamics are broadly stable, with localised deposition zones identified.`
                : `${loc.name}'s coastline shows near-neutral net change (${state.data.net_change_m.toFixed(1)} m). ${state.data.stable_pct.toFixed(0)}% of the shoreline is classified as stable.`
              }
            </p>
          </div>
        </div>
      )}

      {state.status === "idle" && (
        <div className="rounded-lg border border-[var(--border)] bg-surface/50 px-6 py-10 text-center">
          <div className="font-mono text-xs tracking-[0.2em] uppercase text-[var(--text-dim)] mb-2">
            Ready to Analyse
          </div>
          <p className="font-sans text-sm text-[var(--text-dim)] max-w-sm mx-auto">
            Click "Run Analysis" to query the Sentinel-1 SAR archive via
            Google Earth Engine and compute shoreline change metrics.
          </p>
        </div>
      )}
    </div>
  );
}
