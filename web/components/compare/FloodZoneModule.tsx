import { RegionTypeBadge } from "@/components/command/RegionTypeBadge";

export function FloodZoneModule() {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-4 relative overflow-hidden animate-float-up card-glow-gold"
      style={{ borderLeftColor: "#D4A55A", borderLeftWidth: "2px", animationDelay: "0.19s" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "#D4A55A" }} />
      <div className="relative">
        <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          Flood Zone Area
        </div>
        <div className="flex items-center gap-2">
          <RegionTypeBadge type="urban_flood" />
          <span className="font-mono text-[13px] text-[var(--text)]">High-density residential zone</span>
        </div>
        <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-2">
          BCC FeatureServer source
        </div>
      </div>
    </div>
  );
}
