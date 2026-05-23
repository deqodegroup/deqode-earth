import type { DisplacementData } from "@/lib/compare-data";

interface Props {
  data: DisplacementData | null;
}

export function TrendModule({ data }: Props) {
  const avg = data?.annual_avg ?? null;
  // Net migration NEGATIVE = people leaving = displacement UP = bad (coral).
  // Net migration POSITIVE = inflow = teal.
  const valueColor = avg == null
    ? "text-[var(--text-dim)]"
    : avg < 0
      ? "text-coral"
      : "text-teal";
  const display = avg == null
    ? "—"
    : `${avg > 0 ? "+" : ""}${avg.toLocaleString()}`;

  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-4 relative overflow-hidden animate-float-up card-glow-teal"
      style={{ borderLeftColor: "#4CB9C0", borderLeftWidth: "2px", animationDelay: "0.12s" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "#4CB9C0" }} />
      <div className="relative">
        <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          Displacement Trend
        </div>
        <div className={`font-display text-[28px] leading-none ${valueColor}`}>
          {display}
        </div>
        <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-2">
          {avg == null ? "No annual trend data" : "people / year avg net migration"}
        </div>
      </div>
    </div>
  );
}
