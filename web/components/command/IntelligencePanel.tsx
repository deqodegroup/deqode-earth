"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { RiskScoreHUD } from "./RiskScoreHUD";
import { RegionTypeBadge } from "./RegionTypeBadge";

const FALLBACK_SCORES: Record<string, number> = {
  niue: 72, tuvalu: 87, palau: 83, fiji: 65,
  kiribati: 89, "marshall-islands": 85, vanuatu: 68, "solomon-islands": 61,
  brisbane: 64, grantham: 58,
};

const SLUG_TO_COUNTRY: Record<string, string> = {
  niue: "NU",
  tuvalu: "TV",
  kiribati: "KI",
  "marshall-islands": "MH",
  fiji: "FJ",
  vanuatu: "VU",
  "solomon-islands": "SB",
  palau: "PW",
  brisbane: "AU",
  grantham: "AU",
};

const MODULES = [
  { id: "coastline",    label: "Coastline" },
  { id: "ocean",        label: "Ocean" },
  { id: "reef",         label: "Reef" },
  { id: "land",         label: "Land" },
  { id: "climate",      label: "Climate" },
  { id: "displacement", label: "Displacement" },
];

const RMAC_LINKS = [
  {
    href: "/showcase/alofi-south",
    label: "Public activity log",
    description: "Field evidence workflow",
  },
  {
    href: "/showcase/alofi-south/insights",
    label: "Reporting insights",
    description: "Approved evidence dashboard",
  },
  {
    href: "/rmac/alofi-south",
    label: "Committee workspace",
    description: "Protected review access",
  },
];

interface DisplacementData {
  total_displaced: number;
  trend: { year: number; net_migration: number }[];
}

interface FloodDepthData {
  depth_m: number | null;
  source: string;
}

function deriveScore(
  slug: string,
  displacement: DisplacementData | null,
  floodDepth: FloodDepthData | null
): number {
  if (slug === "brisbane" || slug === "grantham") {
    if (floodDepth?.depth_m != null) {
      const d = floodDepth.depth_m;
      if (d > 5) return 80;
      if (d > 3) return 65;
      if (d > 1) return 50;
      return 40;
    }
    return FALLBACK_SCORES[slug] ?? 50;
  }

  if (displacement != null) {
    const n = displacement.total_displaced;
    if (n > 10000) return 85;
    if (n > 1000) return 70;
    if (n > 100) return 55;
    return 40;
  }

  return FALLBACK_SCORES[slug] ?? 50;
}

export function shouldShowRmacDropdown(slug: string): boolean {
  return slug === "niue";
}

export function IntelligencePanel() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("region");
  const region = slug ? REGIONS[slug] : null;

  const [displacement, setDisplacement] = useState<DisplacementData | null>(null);
  const [floodDepth, setFloodDepth] = useState<FloodDepthData | null>(null);
  const [loadingDisplacement, setLoadingDisplacement] = useState(false);
  const [loadingFloodDepth, setLoadingFloodDepth] = useState(false);

  useEffect(() => {
    if (!slug) {
      setDisplacement(null);
      setFloodDepth(null);
      return;
    }

    const countryCode = SLUG_TO_COUNTRY[slug];
    if (countryCode) {
      setLoadingDisplacement(true);
      setDisplacement(null);
      fetch(`/api/displacement?country=${countryCode}`)
        .then((r) => r.ok ? r.json() : null)
        .then((json) => {
          if (json) {
            setDisplacement({
              total_displaced: json.total_displaced ?? 0,
              trend: json.trend ?? [],
            });
          }
        })
        .catch(() => {/* silently fall back to FALLBACK_SCORES */})
        .finally(() => setLoadingDisplacement(false));
    }

    setLoadingFloodDepth(true);
    setFloodDepth(null);

    const isAustralia = slug === "brisbane" || slug === "grantham";
    const depthUrl = isAustralia
      ? `/api/flood-depth?region=${slug}&return_period=100`
      : `/api/flood-depth?region=${slug}&scenario=current`;

    fetch(depthUrl)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) {
          setFloodDepth({
            depth_m: json.depth_m ?? null,
            source: json.source ?? "unknown",
          });
        }
      })
      .catch(() => {/* silently fall back */})
      .finally(() => setLoadingFloodDepth(false));
  }, [slug]);

  if (!region) return null;

  const isLoading = loadingDisplacement || loadingFloodDepth;
  const score = deriveScore(region.slug, displacement, floodDepth);

  const displacedDisplay = loadingDisplacement
    ? "Loading..."
    : displacement != null
    ? displacement.total_displaced.toLocaleString()
    : "No data";

  const depthDisplay = loadingFloodDepth
    ? "Loading..."
    : floodDepth?.depth_m != null
    ? `${floodDepth.depth_m}m`
    : "No data";

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
          <StatCell label="Displaced" value={displacedDisplay} />
          <StatCell label="Flood Depth (100yr)" value={depthDisplay} />
        </div>
      </div>

      {shouldShowRmacDropdown(region.slug) && (
        <div className="p-4 border-b border-[var(--border)]">
          <details
            className="group rounded border border-[var(--gold)]/35 bg-[var(--gold)]/[0.06]
                       focus-within:border-[var(--gold)]"
          >
            <summary
              className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3
                         px-3 py-2.5 text-left transition-colors duration-150
                         hover:bg-[var(--gold)]/[0.08]
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--gold)]"
            >
              <span>
                <span className="block font-mono text-[0.5rem] tracking-[0.2em] uppercase text-[var(--gold)]">
                  Alofi South RMAC
                </span>
                <span className="mt-1 block font-syne text-xs text-[var(--text)]">
                  Community evidence and management-plan reporting
                </span>
              </span>
              <span
                aria-hidden="true"
                className="font-mono text-sm text-[var(--gold)] transition-transform duration-150 group-open:rotate-180"
              >
                v
              </span>
            </summary>
            <div className="border-t border-[var(--gold)]/20 px-3 py-2">
              {RMAC_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-[var(--text-dim)] transition-colors duration-150
                             hover:text-[var(--gold)] focus-visible:outline
                             focus-visible:outline-2 focus-visible:outline-offset-2
                             focus-visible:outline-[var(--gold)]"
                >
                  <span className="block font-mono text-[0.56rem] tracking-[0.12em] uppercase">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block font-syne text-xs">
                    {link.description}
                  </span>
                </Link>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Risk score */}
      <RiskScoreHUD score={isLoading ? (FALLBACK_SCORES[region.slug] ?? 50) : score} tier={region.risk} />

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

      {/* Compare CTA + Case Study CTA */}
      <div className="p-4 mt-auto">
        <Link
          href={`/compare/${region.slug}/brisbane`}
          className="block w-full font-mono text-[0.6rem] tracking-[0.14em] uppercase
                     text-center py-2.5 rounded border border-teal/40 bg-teal/5
                     text-teal hover:bg-teal/10 transition-colors duration-150"
        >
          Compare with Brisbane →
        </Link>
        {region.regionType === "managed_retreat" && (
          <Link
            href={`/cases/${region.slug}`}
            className="block w-full font-mono text-[0.6rem] tracking-[0.14em] uppercase
                       text-center py-2.5 rounded border border-[var(--gold)]/40 bg-[var(--gold)]/5
                       text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors duration-150 mt-2"
          >
            View Case Study →
          </Link>
        )}
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
