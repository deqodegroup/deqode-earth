import { Suspense } from "react";
import {
  ACTIVE_SUB_REGIONS,
  COMING_SOON_SUB_REGIONS,
  SUB_REGIONS,
  getRegionsBySubRegion,
} from "@/lib/regions";
import { RegionRowClient } from "./RegionTreeClient";

export function RegionTree() {
  return (
    <nav aria-label="Asia-Pacific region selector" className="py-2">
      {ACTIVE_SUB_REGIONS.map((subRegion) => {
        const regions = getRegionsBySubRegion(subRegion);
        if (!regions.length) return null;
        return (
          <SubRegionGroup
            key={subRegion}
            label={SUB_REGIONS[subRegion]}
            regions={regions}
          />
        );
      })}

      {COMING_SOON_SUB_REGIONS.map((subRegion) => (
        <div key={subRegion} className="px-4 py-2 mt-1 opacity-40">
          <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-1">
            {SUB_REGIONS[subRegion]}
          </div>
          <div className="font-syne text-[0.65rem] text-[var(--text-dim)] pl-4">
            Coming soon
          </div>
        </div>
      ))}
    </nav>
  );
}

function SubRegionGroup({
  label,
  regions,
}: {
  label: string;
  regions: ReturnType<typeof getRegionsBySubRegion>;
}) {
  return (
    <div className="mb-2">
      <div className="px-4 pt-3 pb-1.5">
        <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">
          {label}
        </span>
      </div>
      <Suspense fallback={null}>
        {regions.map((region) => (
          <RegionRowClient key={region.slug} region={region} />
        ))}
      </Suspense>
    </div>
  );
}
