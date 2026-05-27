import type { Region } from "@/lib/regions";
import { ModuleShell, MetricCard } from "./ModuleShell";

const LAND_DATA: Record<string, { below1m: string; below2m: string; below5m: string; note: string }> = {
  tuvalu:             { below1m: "~26%", below2m: "~67%", below5m: "~99%", note: "Mean elevation 2m. Entire atoll at existential risk under SLR." },
  kiribati:           { below1m: "~18%", below2m: "~55%", below5m: "~98%", note: "South Tarawa densely populated — 75% of residents at 2m or below." },
  "marshall-islands": { below1m: "~20%", below2m: "~60%", below5m: "~99%", note: "Majuro Atoll max elevation 3m. Groundwater lens salinising." },
  palau:              { below1m: "~8%",  below2m: "~19%", below5m: "~38%", note: "Volcanic high islands provide topographic refuge for most population." },
  niue:               { below1m: "~3%",  below2m: "~8%",  below5m: "~15%", note: "Raised coral platform — highest SIDS elevation profile in Polynesia." },
  fiji:               { below1m: "~6%",  below2m: "~14%", below5m: "~28%", note: "Coastal deltas and low-lying Yasawa islands most exposed." },
  vanuatu:            { below1m: "~5%",  below2m: "~12%", below5m: "~24%", note: "Volcanic terrain provides elevation; coastal villages most at risk." },
  "solomon-islands":  { below1m: "~7%",  below2m: "~16%", below5m: "~31%", note: "Guadalcanal coastal plain at high inundation risk." },
  brisbane:           { below1m: "~4%",  below2m: "~9%",  below5m: "~18%", note: "Brisbane River floodplain. ~6,900 properties inundated in 2011 flood." },
  grantham:           { below1m: "~12%", below2m: "~28%", below5m: "~55%", note: "Lockyer Valley floodplain. High proportion of land in 100yr flood zone." },
};

const DEFAULT_LAND = {
  below1m: "Data collection in progress",
  below2m: "—",
  below5m: "—",
  note: "",
};

export function LandModule({ region }: { region: Region }) {
  const data = LAND_DATA[region.slug] ?? DEFAULT_LAND;

  return (
    <ModuleShell
      region={region}
      moduleLabel="Land Intelligence"
      sourceNote="SRTM 30m · IPCC AR6 · Copernicus DEM"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Land Area Below 1m" value={data.below1m} />
        <MetricCard label="Land Area Below 2m" value={data.below2m} />
        <MetricCard label="Land Area Below 5m" value={data.below5m} />
      </div>
      {data.note && (
        <p className="font-mono text-[0.6rem] tracking-[0.1em] text-[var(--text-dim)] mt-4 border-l-2 border-teal/30 pl-3">
          {data.note}
        </p>
      )}
    </ModuleShell>
  );
}
