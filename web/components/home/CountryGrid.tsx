import Link from "next/link";
import { LIVE_FIRST, type Location } from "@/lib/locations";

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "text-coral border-coral/60 bg-coral/20",
  HIGH:     "text-gold  border-gold/30  bg-gold/10",
  MODERATE: "text-sky   border-sky/30   bg-sky/10",
  LOW:      "text-teal  border-teal/30  bg-teal/10",
};

const RISK_LEFT_BORDER: Record<string, string> = {
  CRITICAL: "rgba(224,91,75,0.55)",
  HIGH:     "rgba(212,165,90,0.5)",
  MODERATE: "rgba(59,125,216,0.45)",
  LOW:      "rgba(76,185,192,0.45)",
};

const RISK_GLOW_CLASS: Record<string, string> = {
  CRITICAL: "card-glow-coral",
  HIGH:     "card-glow-gold",
  MODERATE: "card-glow-sky",
  LOW:      "card-glow-teal",
};

function CountryCard({ loc, index }: { loc: Location; index: number }) {
  return (
    <Link
      href={`/${loc.slug}`}
      style={{
        animationDelay: `${index * 0.07}s`,
        borderLeftColor: RISK_LEFT_BORDER[loc.risk],
        borderLeftWidth: "2px",
        borderLeftStyle: "solid",
      }}
      className={`group relative flex flex-col gap-5 rounded-lg border border-[var(--border)]
                 bg-surface p-8 transition-all duration-300
                 hover:bg-surface2 hover:-translate-y-0.5
                 animate-float-up ${RISK_GLOW_CLASS[loc.risk]}`}
    >
      {/* Live badge */}
      {loc.isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5
                        rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
          <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-teal">Live</span>
        </div>
      )}

      {/* Flag + name */}
      <div className="flex items-center gap-4">
        <span className="text-4xl leading-none">{loc.flag}</span>
        <div>
          <div className="font-display text-xl leading-tight text-[var(--text)]">
            {loc.name}
          </div>
          <div className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mt-1">
            {loc.coords}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 text-[var(--text-mid)]">
        <div>
          <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">Population</div>
          <div className="font-sans text-xs font-medium">{loc.pop}</div>
        </div>
        <div>
          <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">EEZ</div>
          <div className="font-sans text-xs font-medium">{loc.eez}</div>
        </div>
      </div>

      {/* Risk chip */}
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[0.65rem] tracking-[0.14em] uppercase
                          border rounded-full px-2 py-0.5 ${RISK_COLOR[loc.risk]}
                          ${loc.risk === "CRITICAL" ? "animate-glow-coral" : loc.risk === "HIGH" ? "animate-glow-gold" : ""}`}>
          {loc.risk} RISK
        </span>
        <span className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)]
                         group-hover:text-teal transition-colors">
          View <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

export function CountryGrid() {
  return (
    <section className="max-w-[1440px] mx-auto px-16 py-16">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-2">
            Pacific SIDS — Active Coverage
          </div>
          <h2 className="font-display text-3xl text-[var(--text)]">
            Select a Territory
          </h2>
        </div>
        <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)]">
          {LIVE_FIRST.filter(l => l.isLive).length} Live ·{" "}
          {LIVE_FIRST.filter(l => !l.isLive).length} Pending
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {LIVE_FIRST.map((loc, i) => (
          <CountryCard key={loc.slug} loc={loc} index={i} />
        ))}
      </div>
    </section>
  );
}
