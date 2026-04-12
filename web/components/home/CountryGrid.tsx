import Link from "next/link";
import { LIVE_FIRST, type Location } from "@/lib/locations";

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "text-coral border-coral/30 bg-coral/10",
  HIGH:     "text-gold  border-gold/30  bg-gold/10",
  MODERATE: "text-sky   border-sky/30   bg-sky/10",
  LOW:      "text-teal  border-teal/30  bg-teal/10",
};

function CountryCard({ loc }: { loc: Location }) {
  return (
    <Link
      href={`/${loc.slug}`}
      className="group relative flex flex-col gap-4 rounded-lg border border-[var(--border)]
                 bg-surface p-6 transition-all duration-200
                 hover:border-teal/30 hover:bg-surface2 hover:-translate-y-0.5"
    >
      {/* Live badge */}
      {loc.isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5
                        rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
          <span className="font-mono text-[0.48rem] tracking-[0.12em] uppercase text-teal">Live</span>
        </div>
      )}

      {/* Flag + name */}
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{loc.flag}</span>
        <div>
          <div className="font-display text-base leading-tight text-[var(--text)]">
            {loc.name}
          </div>
          <div className="font-mono text-[0.48rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mt-0.5">
            {loc.coords}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 text-[var(--text-mid)]">
        <div>
          <div className="font-mono text-[0.45rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">Population</div>
          <div className="font-sans text-xs font-medium">{loc.pop}</div>
        </div>
        <div>
          <div className="font-mono text-[0.45rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">EEZ</div>
          <div className="font-sans text-xs font-medium">{loc.eez}</div>
        </div>
      </div>

      {/* Risk chip */}
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[0.48rem] tracking-[0.14em] uppercase
                          border rounded-full px-2 py-0.5 ${RISK_COLOR[loc.risk]}`}>
          {loc.risk} RISK
        </span>
        <span className="font-mono text-[0.48rem] tracking-[0.1em] uppercase text-[var(--text-dim)]
                         group-hover:text-teal transition-colors">
          View →
        </span>
      </div>
    </Link>
  );
}

export function CountryGrid() {
  return (
    <section className="max-w-6xl mx-auto px-12 py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="font-mono text-[0.48rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-2">
            Pacific SIDS — Active Coverage
          </div>
          <h2 className="font-display text-2xl text-[var(--text)]">
            Select a Territory
          </h2>
        </div>
        <div className="font-mono text-[0.48rem] tracking-[0.1em] uppercase text-[var(--text-dim)]">
          {LIVE_FIRST.filter(l => l.isLive).length} Live ·{" "}
          {LIVE_FIRST.filter(l => !l.isLive).length} Pending
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LIVE_FIRST.map((loc) => (
          <CountryCard key={loc.slug} loc={loc} />
        ))}
      </div>
    </section>
  );
}
