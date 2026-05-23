import Link from "next/link";
import type { Region } from "@/lib/regions";
import type { DtmResult } from "@/lib/dtm";

interface Props {
  origin: Region;
  dest: Region;
  /** DTM result (null = no DTM data, fall through to fallbackDisplaced) */
  dtm: DtmResult | null;
  /** Supabase IDMC count used when dtm is null (from /api/displacement) */
  fallbackDisplaced: number | null;
}

export function CompareHeader({ origin, dest, dtm, fallbackDisplaced }: Props) {
  const count = dtm?.total_displaced ?? fallbackDisplaced;
  const sourceLabel = dtm ? "IOM DTM" : "IDMC";
  const sourceColor = dtm
    ? "text-teal/70"
    : "text-[var(--text-mid)]";

  return (
    <div
      className="bg-surface/80 backdrop-blur-sm border-b border-[var(--border)] animate-float-up"
      style={{ minHeight: "64px" }}
    >
      <div className="flex items-center px-6 gap-6 h-full min-h-[64px] py-3">
        {/* Back nav */}
        <Link
          href="/"
          className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-teal/50 rounded"
        >
          ← Command Center
        </Link>

        {/* Region comparison */}
        <div className="flex items-baseline gap-3 flex-1">
          <span className="font-syne text-[18px] md:text-[22px] font-bold text-teal leading-[1.15]">
            {origin.name}
          </span>
          <span className="font-syne text-sm font-normal text-[var(--text-dim)]">
            vs
          </span>
          <span className="font-syne text-[18px] md:text-[22px] font-bold text-gold leading-[1.15]">
            {dest.name}
          </span>
        </div>

        {/* DTM count */}
        <div className="flex flex-col items-end">
          {count != null && count > 0 ? (
            <>
              <span className="font-display text-[28px] text-[var(--text)] leading-none">
                {count.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-1">
                <span className={sourceColor}>{sourceLabel}</span>
                {" · Displacement Events"}
              </span>
            </>
          ) : (
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--text-dim)]">
              No displacement records in database
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
