import type { FloodDepthData } from "@/lib/compare-data";

interface Props {
  data: FloodDepthData | null;
}

export function FloodDepthModule({ data }: Props) {
  const depth = data?.depth_m;
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-4 relative overflow-hidden animate-float-up card-glow-gold"
      style={{ borderLeftColor: "#D4A55A", borderLeftWidth: "2px", animationDelay: "0.12s" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "#D4A55A" }} />
      <div className="relative">
        <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          Flood Depth (100yr)
        </div>
        {depth != null ? (
          <div className="font-display text-[28px] leading-none text-[var(--text)]">
            {depth.toFixed(1)}
            <span className="font-mono text-[13px] text-[var(--text-dim)] ml-1.5 font-normal">m</span>
          </div>
        ) : (
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)]">
            No depth data
          </div>
        )}
        <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-2">
          JRC GloFAS · 90m resolution
        </div>
      </div>
    </div>
  );
}
