import type { Region } from "@/lib/regions";
import { ModuleShell, MetricCard } from "./ModuleShell";

interface ReefData {
  alertLevel: number;
  bleachedPct: string;
  lastEvent: string;
}

const REEF_DATA: Record<string, ReefData | null> = {
  tuvalu:             { alertLevel: 2, bleachedPct: "38%", lastEvent: "2023 — Alert Level 2 event" },
  kiribati:           { alertLevel: 2, bleachedPct: "41%", lastEvent: "2023 — Widespread bleaching confirmed" },
  "marshall-islands": { alertLevel: 2, bleachedPct: "35%", lastEvent: "2022 — Alert Level 2 event" },
  palau:              { alertLevel: 1, bleachedPct: "22%", lastEvent: "2023 — Alert Level 1, partial recovery since 2017" },
  niue:               { alertLevel: 1, bleachedPct: "18%", lastEvent: "2022 — Alert Level 1" },
  fiji:               { alertLevel: 2, bleachedPct: "31%", lastEvent: "2022 — Major bleaching event" },
  vanuatu:            { alertLevel: 1, bleachedPct: "19%", lastEvent: "2023 — Alert Level 1" },
  "solomon-islands":  { alertLevel: 1, bleachedPct: "21%", lastEvent: "2023 — Alert Level 1, Coral Triangle buffer" },
  brisbane:           null,
  grantham:           null,
};

const ALERT_COLORS: Record<number, string> = {
  0: "text-teal",
  1: "text-gold",
  2: "text-coral",
};

export function ReefModule({ region }: { region: Region }) {
  const data = REEF_DATA[region.slug];

  if (!data) {
    return (
      <ModuleShell
        region={region}
        moduleLabel="Reef Intelligence"
        sourceNote="NOAA Coral Reef Watch"
      >
        <p className="font-sans text-sm text-[var(--text-mid)]">
          No reef extent in this analysis area.
        </p>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      region={region}
      moduleLabel="Reef Intelligence"
      sourceNote="NOAA Coral Reef Watch · 2024 Annual Summary"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Bleaching Alert Level"
          value={`Level ${data.alertLevel}`}
          valueClass={ALERT_COLORS[data.alertLevel]}
        />
        <MetricCard label="Reef Area Bleached (2024)" value={data.bleachedPct} />
        <MetricCard label="Last Significant Event" value={data.lastEvent} />
      </div>
    </ModuleShell>
  );
}
