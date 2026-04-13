import { TopNav } from "@/components/nav/TopNav";
import { CountryGrid } from "@/components/home/CountryGrid";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-ocean">
      <TopNav />

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-12 pt-20 pb-16 w-full overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none"
             style={{
               backgroundImage: `
                 linear-gradient(var(--grid) 1px, transparent 1px),
                 linear-gradient(90deg, var(--grid) 1px, transparent 1px)
               `,
               backgroundSize: "48px 48px",
             }} />

        {/* Atmospheric radial glow */}
        <div className="absolute top-0 left-0 w-[700px] h-[480px] pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 55% 60% at 22% 38%, rgba(76,185,192,0.07) 0%, transparent 70%)' }} />

        {/* Scan sweep */}
        <div className="scan-line" />

        <div className="relative z-10">
          <div className="animate-float-up" style={{ animationDelay: '0.05s' }}>
            <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-teal mb-4">
              DEQODE GROUP · SOVEREIGN INTELLIGENCE
            </div>
          </div>
          <div className="animate-float-up" style={{ animationDelay: '0.15s' }}>
            <h1 className="font-display text-5xl md:text-6xl leading-tight text-[var(--text)] mb-6 max-w-3xl">
              Pacific Ocean<br />
              <span className="text-teal glow-text-teal">Intelligence</span> Platform
            </h1>
          </div>
          <div className="animate-float-up" style={{ animationDelay: '0.28s' }}>
            <p className="font-sans text-base text-[var(--text-mid)] max-w-xl leading-relaxed mb-8">
              Satellite-verified coastal, ocean, reef, and land intelligence
              for Pacific island governments — powered by Sentinel SAR and
              optical analysis.
            </p>
          </div>
          <div className="animate-float-up flex items-center gap-6 flex-wrap" style={{ animationDelay: '0.42s' }}>
            <div className="flex items-center gap-2">
              <span className="relative flex items-center justify-center w-2.5 h-2.5">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-teal/25 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
              </span>
              <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-teal">
                Sentinel-1 SAR Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky" />
              <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--text-dim)]">
                8 Pacific SIDS Monitored
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--text-dim)]">
                Santiago Network Aligned
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--border)] mx-12" />

      {/* Country grid */}
      <CountryGrid />

      {/* Footer strip */}
      <footer className="mt-auto border-t border-[var(--border)] px-12 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
            © 2026 DEQODE Group — All intelligence is satellite-verified
          </span>
          <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
            Classification: SOVEREIGN · Not for public distribution
          </span>
        </div>
      </footer>
    </div>
  );
}
