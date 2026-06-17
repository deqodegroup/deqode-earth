"use client";

import { useEffect, useState } from "react";
import type { Region } from "@/lib/regions";
import { ModuleShell, MetricCard } from "./ModuleShell";
import type { OceanSummary } from "@/lib/ocean/metrics";

const OCEAN_DATA: Record<string, { sst: string; acidification: string; note: string }> = {
  tuvalu:             { sst: "+0.9°C since 1985", acidification: "pH 8.07 (↓0.11 since 1850)", note: "Elevated bleaching risk season: Nov–Apr" },
  kiribati:           { sst: "+0.8°C since 1985", acidification: "pH 8.06 (↓0.12 since 1850)", note: "El Niño-driven SST spikes compound risk" },
  "marshall-islands": { sst: "+0.8°C since 1985", acidification: "pH 8.07 (↓0.11 since 1850)", note: "Elevated bleaching risk season: Nov–Apr" },
  palau:              { sst: "+0.7°C since 1985", acidification: "pH 8.08 (↓0.10 since 1850)", note: "Elevated bleaching risk: ENSO warm years" },
  niue:               { sst: "+0.6°C since 1985", acidification: "pH 8.09 (↓0.09 since 1850)", note: "Deep water upwelling provides seasonal buffering" },
  fiji:               { sst: "+0.7°C since 1985", acidification: "pH 8.08 (↓0.10 since 1850)", note: "Elevated bleaching risk season: Dec–Mar" },
  vanuatu:            { sst: "+0.7°C since 1985", acidification: "pH 8.08 (↓0.10 since 1850)", note: "Category 5 cyclone risk intersects bleaching season" },
  "solomon-islands":  { sst: "+0.6°C since 1985", acidification: "pH 8.09 (↓0.09 since 1850)", note: "Coral triangle boundary — moderate acidification buffer" },
  brisbane:           { sst: "+0.5°C since 1985", acidification: "pH 8.10 (↓0.08 since 1850)", note: "Moreton Bay — subtropical; less bleaching risk than GBR" },
  grantham:           { sst: "N/A — inland region", acidification: "N/A — inland region", note: "Grantham is 90km inland from Moreton Bay" },
};

const DEFAULT_OCEAN = {
  sst: "Data collection in progress",
  acidification: "Data collection in progress",
  note: "",
};

const TREND_ARROW: Record<string, string> = {
  rising: "↑",
  falling: "↓",
  stable: "→",
  unknown: "",
};

function formatSst(summary: OceanSummary["sst"]): string {
  if (summary.latestValue === null) return "";
  const arrow = TREND_ARROW[summary.trend.direction];
  const delta =
    summary.trend.deltaValue !== null
      ? ` (${summary.trend.deltaValue > 0 ? "+" : ""}${summary.trend.deltaValue}°C since ${summary.trend.comparedTo})`
      : "";
  return `${summary.latestValue.toFixed(2)}°C ${arrow}${delta}`;
}

function formatPh(summary: OceanSummary["ph"]): string {
  if (summary.latestValue === null) return "";
  const arrow = TREND_ARROW[summary.trend.direction];
  const delta =
    summary.trend.deltaValue !== null
      ? ` (${summary.trend.deltaValue > 0 ? "+" : ""}${summary.trend.deltaValue} since ${summary.trend.comparedTo})`
      : "";
  return `pH ${summary.latestValue.toFixed(2)} ${arrow}${delta}`;
}

export function OceanModule({ region }: { region: Region }) {
  const [live, setLive] = useState<OceanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ocean?region=${region.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && (json.sst?.latestValue !== null || json.ph?.latestValue !== null)) {
          setLive({ sst: json.sst, ph: json.ph });
        } else {
          setLive(null);
        }
      })
      .catch(() => setLive(null))
      .finally(() => setLoading(false));
  }, [region.slug]);

  const fallback = OCEAN_DATA[region.slug] ?? DEFAULT_OCEAN;
  const liveSst = live ? formatSst(live.sst) : "";
  const livePh = live ? formatPh(live.ph) : "";

  return (
    <ModuleShell
      region={region}
      moduleLabel="Ocean Intelligence"
      sourceNote={
        live
          ? "NOAA CoralTemp (live) · Copernicus Marine Service"
          : "NOAA CoralTemp · SOCAT · IPCC AR6"
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          label="Sea Surface Temperature"
          value={loading ? "Loading…" : liveSst || fallback.sst}
        />
        <MetricCard
          label="Ocean Acidification"
          value={loading ? "Loading…" : livePh || fallback.acidification}
        />
      </div>
      {fallback.note && (
        <p className="font-mono text-[0.6rem] tracking-[0.1em] text-[var(--text-dim)] mt-4 border-l-2 border-teal/30 pl-3">
          {fallback.note}
        </p>
      )}
    </ModuleShell>
  );
}
