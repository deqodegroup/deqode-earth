import type { Region } from "@/lib/regions";
import { ModuleShell, MetricCard } from "./ModuleShell";

const CLIMATE_DATA: Record<string, { tempDelta: string; scenario: string; rainfallTrend: string; cycloneNote: string }> = {
  tuvalu:             { tempDelta: "+1.8°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "±5% (high variability)", cycloneNote: "Increasing proportion of intense (Cat 4–5) cyclones projected" },
  kiribati:           { tempDelta: "+1.7°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+8% wet season", cycloneNote: "Outside main cyclone belt — drought risk under El Niño" },
  "marshall-islands": { tempDelta: "+1.8°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "-12% dry season", cycloneNote: "Typhoon risk increasing in southern atolls" },
  palau:              { tempDelta: "+1.6°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+6% annual", cycloneNote: "Super Typhoon corridor — track intensification likely" },
  niue:               { tempDelta: "+1.5°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "-8% dry season", cycloneNote: "Category 5 risk; direct hit recurrence interval ~25 years" },
  fiji:               { tempDelta: "+1.6°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+5% wet season", cycloneNote: "Cyclone season extending; intensification of Cat 4–5 events" },
  vanuatu:            { tempDelta: "+1.6°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+7% wet season", cycloneNote: "Direct Cat 5 track (Pam 2015 precedent); frequency rising" },
  "solomon-islands":  { tempDelta: "+1.5°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+6% wet season", cycloneNote: "Flash flood risk from intense rainfall events increasing" },
  brisbane:           { tempDelta: "+1.4°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+4% summer rainfall", cycloneNote: "East-coast lows intensifying; compound flood events projected" },
  grantham:           { tempDelta: "+1.5°C by 2050", scenario: "SSP5-8.5", rainfallTrend: "+6% summer rainfall", cycloneNote: "Lockyer Valley — extreme rainfall events projected to increase 20–30%" },
};

const DEFAULT_CLIMATE = {
  tempDelta: "Data collection in progress",
  scenario: "—",
  rainfallTrend: "—",
  cycloneNote: "",
};

export function ClimateModule({ region }: { region: Region }) {
  const data = CLIMATE_DATA[region.slug] ?? DEFAULT_CLIMATE;

  return (
    <ModuleShell
      region={region}
      moduleLabel="Climate Intelligence"
      sourceNote="NASA NEX-GDDP-CMIP6 · IPCC AR6 WG1 · BOM"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          label={`Temperature Projection (${data.scenario})`}
          value={data.tempDelta}
        />
        <MetricCard label="Rainfall Trend" value={data.rainfallTrend} />
      </div>
      {data.cycloneNote && (
        <p className="font-mono text-[0.6rem] tracking-[0.1em] text-[var(--text-dim)] mt-4 border-l-2 border-gold/30 pl-3">
          {data.cycloneNote}
        </p>
      )}
    </ModuleShell>
  );
}
