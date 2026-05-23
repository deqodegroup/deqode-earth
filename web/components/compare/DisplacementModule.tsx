import Link from "next/link";
import type { DisplacementData } from "@/lib/compare-data";
import type { Region } from "@/lib/regions";

interface Props {
  region: Region;
  data: DisplacementData | null;
}

export function DisplacementModule({ region, data }: Props) {
  const count = data?.total_displaced ?? null;
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-surface p-4 relative overflow-hidden animate-float-up card-glow-teal"
      style={{ borderLeftColor: "#4CB9C0", borderLeftWidth: "2px", animationDelay: "0.05s" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "#4CB9C0" }} />
      <div className="relative">
        <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-3">
          Displacement Events
        </div>
        {count != null && count > 0 ? (
          <div className="font-display text-[28px] leading-none text-teal">
            {count.toLocaleString()}
            <span className="font-mono text-[13px] text-[var(--text-dim)] ml-2 font-normal">people</span>
          </div>
        ) : (
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)]">
            No displacement records in database
          </div>
        )}
        <Link
          href={`/?region=${region.slug}`}
          className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors duration-150 mt-2 block"
        >
          View full intelligence →
        </Link>
      </div>
    </div>
  );
}
