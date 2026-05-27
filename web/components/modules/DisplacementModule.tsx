"use client";

import { useEffect, useState } from "react";
import type { Region } from "@/lib/regions";
import { ModuleShell, MetricCard } from "./ModuleShell";

const SLUG_TO_COUNTRY: Record<string, string> = {
  niue:               "NU",
  tuvalu:             "TV",
  kiribati:           "KI",
  "marshall-islands": "MH",
  fiji:               "FJ",
  vanuatu:            "VU",
  "solomon-islands":  "SB",
  palau:              "PW",
  brisbane:           "AU",
  grantham:           "AU",
};

interface DisplacementData {
  total_displaced: number;
  trend: { year: number; net_migration: number }[];
}

export function DisplacementModule({ region }: { region: Region }) {
  const [data, setData] = useState<DisplacementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const country = SLUG_TO_COUNTRY[region.slug];
    if (!country) {
      setLoading(false);
      return;
    }
    fetch(`/api/displacement?country=${country}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) {
          setData({
            total_displaced: json.total_displaced ?? 0,
            trend: json.trend ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [region.slug]);

  if (loading) {
    return (
      <ModuleShell
        region={region}
        moduleLabel="Displacement Intelligence"
        sourceNote="IOM DTM · IDMC GIDD"
      >
        <p className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
          Loading displacement data...
        </p>
      </ModuleShell>
    );
  }

  if (!data) {
    return (
      <ModuleShell
        region={region}
        moduleLabel="Displacement Intelligence"
        sourceNote="IOM DTM · IDMC GIDD"
      >
        <p className="font-sans text-sm text-[var(--text-mid)]">
          No displacement data available for this region.
        </p>
      </ModuleShell>
    );
  }

  const recentTrend = data.trend.slice(-5).reverse();

  return (
    <ModuleShell
      region={region}
      moduleLabel="Displacement Intelligence"
      sourceNote="IOM DTM · IDMC GIDD · World Bank wbgapi"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <MetricCard
          label="Total Displaced (cumulative)"
          value={data.total_displaced.toLocaleString()}
        />
        <MetricCard
          label="Data Years Available"
          value={`${data.trend.length} years`}
        />
      </div>

      {recentTrend.length > 0 && (
        <div>
          <div className="font-mono text-[0.5rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
            Net Migration Trend (recent)
          </div>
          <div className="space-y-1.5">
            {recentTrend.map((t) => (
              <div key={t.year} className="flex items-center gap-3">
                <span className="font-mono text-[0.55rem] text-[var(--text-dim)] w-10 flex-shrink-0">
                  {t.year}
                </span>
                <div className="flex-1 h-1.5 bg-surface2/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${t.net_migration < 0 ? "bg-coral" : "bg-teal"}`}
                    style={{
                      width: `${Math.min(100, Math.abs(t.net_migration) / 500)}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-[0.55rem] text-[var(--text-mid)] w-16 text-right flex-shrink-0">
                  {t.net_migration > 0 ? "+" : ""}
                  {t.net_migration.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
