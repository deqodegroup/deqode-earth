"use client";

import { useState } from "react";
import { type Location } from "@/lib/locations";
import { MetricCards, type CoastlineMetrics } from "./MetricCards";

type AnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; data: CoastlineMetrics }
  | { status: "error"; message: string };

export function CoastlineModule({ loc }: { loc: Location }) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  async function runAnalysis() {
    setState({ status: "running" });
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: loc.slug }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setState({ status: "error", message: err.error ?? "Analysis failed" });
        return;
      }
      const data: CoastlineMetrics = await res.json();
      setState({ status: "done", data });
    } catch (e) {
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
          <div className="font-mono text-[0.45rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mb-1">
            Analysis Window
          </div>
          <div className="font-sans text-sm text-[var(--text-mid)]">
            2019 – 2025 · Sentinel-1 SAR · 10 m resolution
          </div>
        </div>

        <div className="flex items-center gap-3">
          {state.status === "done" && (
            <>
              <button
                onClick={() => downloadReport("txt")}
                className="font-mono text-[0.48rem] tracking-[0.14em] uppercase
                           px-4 py-2 rounded border border-[var(--border)]
                           text-[var(--text-mid)] hover:border-teal hover:text-teal transition-colors"
              >
                Export TXT
              </button>
              <button
                onClick={() => downloadReport("pdf")}
                className="font-mono text-[0.48rem] tracking-[0.14em] uppercase
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
            className="font-mono text-[0.48rem] tracking-[0.14em] uppercase
                       px-5 py-2 rounded bg-teal text-ocean font-medium
                       hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {state.status === "running" ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Results */}
      {state.status === "running" && (
        <div className="rounded-lg border border-teal/20 bg-teal/5 px-6 py-8 text-center">
          <div className="font-mono text-[0.52rem] tracking-[0.2em] uppercase text-teal mb-2">
            Querying Google Earth Engine
          </div>
          <div className="font-sans text-xs text-[var(--text-dim)]">
            Processing Sentinel-1 SAR imagery · This takes 20–60 seconds
          </div>
          <div className="mt-4 w-40 mx-auto h-0.5 bg-surface2 rounded overflow-hidden">
            <div className="h-full bg-teal rounded animate-[shimmer_1.5s_ease-in-out_infinite]
                            w-1/2" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-coral/30 bg-coral/5 px-6 py-4">
          <div className="font-mono text-[0.48rem] tracking-[0.14em] uppercase text-coral mb-1">
            Analysis Failed
          </div>
          <div className="font-sans text-xs text-[var(--text-mid)]">{state.message}</div>
        </div>
      )}

      {state.status === "done" && (
        <div className="space-y-4">
          <div className="font-mono text-[0.45rem] tracking-[0.14em] uppercase text-[var(--text-dim)]">
            Results · {state.data.period_start} – {state.data.period_end}
          </div>
          <MetricCards data={state.data} />
          <div className="rounded-lg border border-[var(--border)] bg-surface p-5">
            <div className="font-mono text-[0.45rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mb-2">
              Interpretation
            </div>
            <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
              {state.data.net_change_m < -1
                ? `${loc.name} is experiencing net coastal erosion of ${Math.abs(state.data.net_change_m).toFixed(1)} m over the analysis period. Immediate monitoring and intervention planning is recommended.`
                : state.data.net_change_m > 1
                ? `${loc.name} shows net coastal accretion of ${state.data.net_change_m.toFixed(1)} m. Sediment dynamics are broadly stable, with localised deposition zones identified.`
                : `${loc.name}'s coastline shows near-neutral net change (${state.data.net_change_m.toFixed(1)} m). ${state.data.stable_pct.toFixed(0)}% of the shoreline is classified as stable.`
              }
            </p>
          </div>
        </div>
      )}

      {state.status === "idle" && (
        <div className="rounded-lg border border-[var(--border)] bg-surface/50 px-6 py-12 text-center">
          <div className="font-mono text-[0.48rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-2">
            Ready to Analyse
          </div>
          <p className="font-sans text-xs text-[var(--text-dim)] max-w-sm mx-auto">
            Click "Run Analysis" to query the Sentinel-1 SAR archive via
            Google Earth Engine and compute shoreline change metrics.
          </p>
        </div>
      )}
    </div>
  );
}
