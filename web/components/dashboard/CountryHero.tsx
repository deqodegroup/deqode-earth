import { type Location } from "@/lib/locations";

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "text-coral border-coral/30 bg-coral/10",
  HIGH:     "text-gold  border-gold/30  bg-gold/10",
  MODERATE: "text-sky   border-sky/30   bg-sky/10",
  LOW:      "text-teal  border-teal/30  bg-teal/10",
};

export function CountryHero({ loc }: { loc: Location }) {
  return (
    <section className="border-b border-[var(--border)] px-12 py-10 bg-surface/30">
      <div className="max-w-6xl mx-auto">
        <div className="font-mono text-[0.48rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-4">
          Pacific SIDS / {loc.name}
        </div>

        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="flex items-center gap-5">
            <span className="text-5xl leading-none">{loc.flag}</span>
            <div>
              <h1 className="font-display text-4xl text-[var(--text)] leading-tight">
                {loc.name}
              </h1>
              <div className="font-mono text-[0.52rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-1">
                {loc.coords}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <StatPill label="Population" value={loc.pop} />
            <StatPill label="EEZ Area" value={loc.eez} />
            <span className={`font-mono text-[0.52rem] tracking-[0.14em] uppercase
                              border rounded-full px-3 py-1.5 ${RISK_COLOR[loc.risk]}`}>
              {loc.risk} RISK
            </span>
            {loc.isLive && (
              <div className="flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                <span className="font-mono text-[0.48rem] tracking-[0.12em] uppercase text-teal">
                  Live Analysis
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--border)] bg-surface px-4 py-2">
      <div className="font-mono text-[0.42rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">
        {label}
      </div>
      <div className="font-sans text-sm font-medium text-[var(--text)]">{value}</div>
    </div>
  );
}
