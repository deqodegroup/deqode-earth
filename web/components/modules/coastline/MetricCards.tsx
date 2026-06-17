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
  // New optional fields for Phase 5 (MNDWI+Otsu algorithm + SLR + CMIP6)
  algorithm?:           string;
  slr_pct_1m?:          number | null;
  slr_pct_2m?:          number | null;
  slr_pct_5m?:          number | null;
  cmip6_temp_delta_c?:  number | null;
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

function SLRBar({ label, pct, accent }: { label: string; pct: number; accent: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
          {label}
        </span>
        <span className="font-mono text-sm text-[var(--text)]">
          {clamped.toFixed(1)}<span className="text-[var(--text-dim)] ml-1 text-[0.65rem]">%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface2 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function SLRExposureCard({
  slr_1m,
  slr_2m,
  slr_5m,
}: {
  slr_1m: number;
  slr_2m: number;
  slr_5m: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface p-5 relative overflow-hidden"
         style={{ borderLeftColor: "#E05B4B", borderLeftWidth: "2px" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
           style={{ background: "#E05B4B" }} />
      <div className="relative space-y-4">
        <div>
          <div className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[var(--text-dim)]">
            Sea-Level Rise Exposure
          </div>
          <div className="font-mono text-[0.55rem] tracking-[0.1em] uppercase text-[var(--text-dim)] opacity-70 mt-1">
            Indicative — SRTM 30 m DEM
          </div>
        </div>
        <div className="space-y-3">
          <SLRBar label="Land below 1m" pct={slr_1m} accent="#E05B4B" />
          <SLRBar label="Land below 2m" pct={slr_2m} accent="#D4A55A" />
          <SLRBar label="Land below 5m" pct={slr_5m} accent="#4A6680" />
        </div>
      </div>
    </div>
  );
}

function CMIP6Card({ delta }: { delta: number | null | undefined }) {
  const hasData = typeof delta === "number";
  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface p-5 relative overflow-hidden"
         style={{ borderLeftColor: "#D4A55A", borderLeftWidth: "2px" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
           style={{ background: "#D4A55A" }} />
      <div className="relative">
        <div className="font-mono text-[0.6rem] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          CMIP6 Temperature Δ
        </div>
        {hasData ? (
          <>
            <div className="font-display text-4xl leading-none text-[#D4A55A]">
              +{(delta as number).toFixed(1)}
              <span className="font-mono text-sm text-[var(--text-dim)] ml-1.5 font-normal">°C</span>
            </div>
            <div className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-2">
              SSP585 · 2090–2100 vs 2020–2030
            </div>
          </>
        ) : (
          <>
            <div className="font-display text-2xl leading-none text-[var(--text-dim)]">No data</div>
            <div className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-2">
              SSP585 grid does not cover this AOI
            </div>
          </>
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
      sub: `unchanged ${data.period_start}-${data.period_end}`,
      accentColor: "#D4A55A",
      trend: "neutral" as const,
    },
  ];

  const showSLR   = typeof data.slr_pct_1m === "number"
                 && typeof data.slr_pct_2m === "number"
                 && typeof data.slr_pct_5m === "number";
  const showCMIP6 = typeof data.cmip6_temp_delta_c === "number" || data.cmip6_temp_delta_c === null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <div key={m.label} className="animate-float-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <Metric {...m} />
          </div>
        ))}
      </div>

      {(showSLR || showCMIP6) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {showSLR && (
            <div className="md:col-span-2 animate-float-up" style={{ animationDelay: "0.4s" }}>
              <SLRExposureCard
                slr_1m={data.slr_pct_1m as number}
                slr_2m={data.slr_pct_2m as number}
                slr_5m={data.slr_pct_5m as number}
              />
            </div>
          )}
          {showCMIP6 && (
            <div className="animate-float-up" style={{ animationDelay: "0.48s" }}>
              <CMIP6Card delta={data.cmip6_temp_delta_c} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
