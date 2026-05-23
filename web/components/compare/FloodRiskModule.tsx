import type { FloodDepthData } from "@/lib/compare-data";
import type { Region } from "@/lib/regions";
import { deriveCompareScore } from "@/lib/compare-data";

interface Props {
  region: Region;
  data: FloodDepthData | null;
}

export function FloodRiskModule({ region, data }: Props) {
  const score = deriveCompareScore(region, null, data);
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-4 relative overflow-hidden animate-float-up card-glow-gold"
      style={{ borderLeftColor: "#D4A55A", borderLeftWidth: "2px", animationDelay: "0.05s" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "#D4A55A" }} />
      <div className="relative">
        <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          Flood Risk Score
        </div>
        <div className="font-display text-[28px] leading-none text-gold">
          {score}
        </div>
        <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-2">
          100yr return period
        </div>
      </div>
    </div>
  );
}
