import Link from "next/link";
import type { Region } from "@/lib/regions";

interface Props {
  region: Region;
}

export function CoastlineStatusModule({ region }: Props) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-4 relative overflow-hidden animate-float-up card-glow-teal"
      style={{ borderLeftColor: "#4CB9C0", borderLeftWidth: "2px", animationDelay: "0.19s" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "#4CB9C0" }} />
      <div className="relative">
        <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          Coastline Status
        </div>
        <Link
          href={`/region/${region.slug}/coastline`}
          className="font-mono text-[9px] tracking-[0.14em] uppercase text-teal hover:text-teal/80 transition-colors duration-150 focus:outline-none focus:underline"
        >
          Coastline analysis →
        </Link>
      </div>
    </div>
  );
}
