import type { ReactNode } from "react";
import type { Region } from "@/lib/regions";
import { RegionTypeBadge } from "@/components/command/RegionTypeBadge";
import { CompareMiniMapClient } from "@/components/compare/CompareMiniMapClient";

interface Props {
  side: "origin" | "dest";
  region: Region;
  sectionHeading: string;
  children?: ReactNode;
}

export function ComparePanel({ side, region, sectionHeading, children }: Props) {
  const bgClass = side === "origin" ? "bg-surface" : "bg-surface2";
  const headingColor = side === "origin" ? "text-teal" : "text-gold";
  const animationDelay = side === "origin" ? "0.06s" : "0.12s";

  return (
    <section
      className={`flex-1 flex flex-col overflow-hidden animate-float-up ${bgClass}`}
      style={{ animationDelay }}
      aria-label={`${region.name} panel`}
    >
      {/* Mini-map with caption overlay */}
      <div className="relative w-full flex-shrink-0 h-[180px] md:h-[220px] lg:h-[280px]">
        <CompareMiniMapClient
          center={region.center}
          zoom={region.zoom}
          ariaLabel={`${region.name} location context map`}
        />
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2 bg-gradient-to-t from-ocean/80 to-transparent pointer-events-none">
          <RegionTypeBadge type={region.regionType} />
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text)]">
            {region.name}
          </span>
        </div>
      </div>

      {/* Section heading + module column */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div
          className={`font-mono text-[9px] tracking-[0.18em] uppercase ${headingColor}`}
        >
          {sectionHeading}
        </div>
        <div className="flex flex-col gap-4" data-compare-modules={side}>
          {children ?? (
            <>
              <div className="compare-module-slot-1 rounded-lg border border-[var(--border)] bg-surface p-4 h-24 animate-pulse" />
              <div className="compare-module-slot-2 rounded-lg border border-[var(--border)] bg-surface p-4 h-24 animate-pulse" />
              <div className="compare-module-slot-3 rounded-lg border border-[var(--border)] bg-surface p-4 h-24 animate-pulse" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
