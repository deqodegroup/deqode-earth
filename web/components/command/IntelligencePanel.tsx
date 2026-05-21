"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { RiskScoreHUD } from "./RiskScoreHUD";
import { RegionTypeBadge } from "./RegionTypeBadge";

const STATIC_SCORES: Record<string, number> = {
  niue: 72, tuvalu: 87, palau: 83, fiji: 65,
  kiribati: 89, "marshall-islands": 85, vanuatu: 68, "solomon-islands": 61,
  brisbane: 64, grantham: 58,
};

const MODULES = [
  { id: "coastline",    label: "Coastline" },
  { id: "ocean",        label: "Ocean" },
  { id: "reef",         label: "Reef" },
  { id: "land",         label: "Land" },
  { id: "climate",      label: "Climate" },
  { id: "displacement", label: "Displacement" },
];

export function IntelligencePanel() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("region");
  const region = slug ? REGIONS[slug] : null;

  if (!region) return null;

  const score = STATIC_SCORES[region.slug] ?? 50;

  return (
    <aside
      className="flex-shrink-0 border-l border-[var(--border)] bg-surface/80
                 overflow-y-auto flex flex-col panel-enter"
      style={{ width: "var(--panel-width)" }}
      aria-label="Intelligence panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="font-syne text-sm font-semibold text-[var(--text)] leading-tight">
              {region.name}
            </div>
            <div className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mt-0.5">
              {region.coords}
            </div>
          </div>
          <RegionTypeBadge type={region.regionType} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <StatCell label="Population" value={region.pop} />
          {region.eez && <StatCell label="EEZ" value={region.eez} />}
          {region.area && <StatCell label="Area" value={region.area} />}
        </div>
      </div>

      {/* Risk score */}
      <RiskScoreHUD score={score} tier={region.risk} />

      {/* Module tabs */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="font-mono text-[0.5rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
          Intelligence Modules
        </div>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((mod) => (
            <Link
              key={mod.id}
              href={`/region/${region.slug}/${mod.id}`}
              className="font-mono text-[0.55rem] tracking-[0.1em] uppercase
                         px-2.5 py-1.5 rounded border border-[var(--border)]
                         text-[var(--text-dim)] hover:border-teal hover:text-teal
                         transition-colors duration-150"
            >
              {mod.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Compare CTA */}
      <div className="p-4 mt-auto">
        <Link
          href={`/compare/${region.slug}/brisbane`}
          className="block w-full font-mono text-[0.6rem] tracking-[0.14em] uppercase
                     text-center py-2.5 rounded border border-teal/40 bg-teal/5
                     text-teal hover:bg-teal/10 transition-colors duration-150"
        >
          Compare with Brisbane →
        </Link>
      </div>
    </aside>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">
        {label}
      </div>
      <div className="font-syne text-xs text-[var(--text)]">{value}</div>
    </div>
  );
}
