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
  sub,
  accentColor,
  trend,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accentColor: string;
  trend?: "negative" | "positive" | "neutral";
}) {
  const valueColor =
    trend === "negative" ? "text-[#E05B4B]"
    : trend === "positive" ? "text-[#4CB9C0]"
    : "text-[var(--text)]";

  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-5 relative overflow-hidden"
      style={{ borderLeftColor: accentColor, borderLeftWidth: "2px" }}
    >
      {/* Subtle background tint from accent */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
           style={{ background: accentColor }} />

      <div className="relative">
        <div className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          {label}
        </div>
        <div className={`font-display text-4xl leading-none ${valueColor}`}>
          {value}
          {unit && (
            <span className="font-mono text-sm text-[var(--text-dim)] ml-1.5 font-normal">{unit}</span>
          )}
        </div>
        {sub && (
          <div className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-2">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricCards({ data }: { data: CoastlineMetrics }) {
  const erosionHa  = (data.erosion_m2  / 10_000).toFixed(2);
  const accretionHa = (data.accretion_m2 / 10_000).toFixed(2);

  const metrics = [
    {
      label: "Coastal Erosion",
      value: data.erosion_m.toFixed(1),
      unit: "m",
      sub: `${erosionHa} ha lost`,
      accentColor: "#E05B4B",
      trend: "negative" as const,
    },
    {
      label: "Coastal Accretion",
      value: data.accretion_m.toFixed(1),
      unit: "m",
      sub: `${accretionHa} ha gained`,
      accentColor: "#4CB9C0",
      trend: "positive" as const,
    },
    {
      label: "Net Change",
      value: data.net_change_m > 0 ? `+${data.net_change_m.toFixed(1)}` : data.net_change_m.toFixed(1),
      unit: "m",
      sub: data.net_change_m < -1 ? "net land loss" : data.net_change_m > 1 ? "net land gain" : "stable shoreline",
      accentColor: data.net_change_m < -1 ? "#E05B4B" : data.net_change_m > 1 ? "#4CB9C0" : "#4A6680",
      trend: (data.net_change_m >= 0 ? "positive" : "negative") as "positive" | "negative",
    },
    {
      label: "Stable Shoreline",
      value: data.stable_pct.toFixed(0),
      unit: "%",
      sub: "unchanged 2019–2024",
      accentColor: "#D4A55A",
      trend: "neutral" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <div key={m.label} className="animate-float-up" style={{ animationDelay: `${i * 0.08}s` }}>
          <Metric {...m} />
        </div>
      ))}
    </div>
  );
}
