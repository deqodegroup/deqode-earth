"use client";

export interface CoastlineMetrics {
  erosion_m:      number;
  accretion_m:    number;
  net_change_m:   number;
  stable_pct:     number;
  erosion_m2:     number;
  accretion_m2:   number;
  period_start:   string;
  period_end:     string;
  mapImageUrl:    string;
}

function Metric({
  label,
  value,
  unit,
  trend,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "negative" | "positive" | "neutral";
}) {
  const color =
    trend === "negative" ? "text-coral"
    : trend === "positive" ? "text-teal"
    : "text-[var(--text)]";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface p-5">
      <div className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mb-2">
        {label}
      </div>
      <div className={`font-display text-3xl leading-none ${color}`}>
        {value}
        {unit && (
          <span className="font-mono text-sm text-[var(--text-dim)] ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}

const METRICS = (data: CoastlineMetrics) => [
  { label: "Coastal Erosion",  value: data.erosion_m.toFixed(1),  unit: "m", trend: "negative" as const },
  { label: "Coastal Accretion", value: data.accretion_m.toFixed(1), unit: "m", trend: "positive" as const },
  {
    label: "Net Change",
    value: data.net_change_m > 0 ? `+${data.net_change_m.toFixed(1)}` : data.net_change_m.toFixed(1),
    unit: "m",
    trend: (data.net_change_m >= 0 ? "positive" : "negative") as "positive" | "negative",
  },
  { label: "Stable Shoreline", value: data.stable_pct.toFixed(0), unit: "%", trend: "neutral" as const },
];

export function MetricCards({ data }: { data: CoastlineMetrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {METRICS(data).map((m, i) => (
        <div key={m.label} className="animate-float-up" style={{ animationDelay: `${i * 0.08}s` }}>
          <Metric {...m} />
        </div>
      ))}
    </div>
  );
}
