import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { GranthamFloodMapClient } from "@/components/cases/GranthamFloodMapClient";

export const revalidate = 3600;

export default function GranthamCasePage() {
  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />

      <main
        style={{
          paddingTop: "var(--bar-height)",
          paddingBottom: "var(--strip-height)",
        }}
      >
        {/* ── 1. Case hero ─────────────────────────────────────────── */}
        <section className="w-full bg-surface/80 border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-14 lg:py-20">
            {/* Badge row */}
            <div className="flex items-center gap-4 mb-6">
              <span className="font-mono text-[0.55rem] tracking-[0.18em] uppercase px-3 py-1 rounded border border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/5">
                Managed Retreat
              </span>
              <span className="font-mono text-[0.55rem] tracking-[0.18em] uppercase text-[var(--text-dim)]">
                Queensland, Australia
              </span>
            </div>

            {/* Primary heading */}
            <h1 className="font-syne text-5xl lg:text-7xl font-semibold text-[var(--text)] mb-4 leading-none">
              Grantham
            </h1>

            {/* Sub-heading */}
            <p className="font-sans text-lg lg:text-xl text-[var(--text-mid)] max-w-2xl mb-6 leading-snug">
              The world's first government-led managed retreat of an entire
              community
            </p>

            {/* Coordinates */}
            <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">
              27°37&#39;S 152°10&#39;E · Lockyer Valley, QLD
            </span>
          </div>
        </section>

        {/* ── 2. Statistics grid ───────────────────────────────────── */}
        <section className="w-full border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                number="160"
                label="Properties Relocated"
                numberColor="text-[var(--text)]"
              />
              <StatCard
                number="12"
                label="Lives Lost · 10 Jan 2011"
                numberColor="text-coral"
              />
              <StatCard
                number="18.9m"
                label="Lockyer Creek Peak · Major: 6.5m"
                numberColor="text-[var(--text)]"
              />
              <StatCard
                number="2013"
                label="Relocation Complete"
                numberColor="text-[var(--gold)]"
              />
            </div>
          </div>
        </section>

        {/* ── 3. Event timeline ────────────────────────────────────── */}
        <section className="w-full border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <p className="font-mono text-[0.55rem] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-8">
              Event Timeline
            </p>
            <div className="flex flex-col lg:flex-row gap-0 lg:gap-0">
              <TimelineNode
                year="10 Jan 2011"
                desc="Wall of water. Lockyer Creek peaks at 18.9m. Full inundation in under 30 minutes."
                isFirst
              />
              <TimelineDivider />
              <TimelineNode
                year="2012"
                desc="Queensland Reconstruction Authority announces buy-back program. ~160 Grantham properties included."
              />
              <TimelineDivider />
              <TimelineNode
                year="2013"
                desc="Relocated residents move to higher ground in Lockyer Valley. New Grantham township established."
              />
              <TimelineDivider />
              <TimelineNode
                year="2 Sep 2026"
                desc="COPRRRA Symposium Day 2 — field trip to Grantham. Policy researchers examine the precedent."
                isLast
                isActive
              />
            </div>
          </div>
        </section>

        {/* ── 4. Flood map ─────────────────────────────────────────── */}
        <section className="w-full border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <p className="font-mono text-[0.55rem] tracking-[0.18em] uppercase text-[var(--text-dim)] mb-4">
              Flood Extent · 2011 Inundation
            </p>
            <GranthamFloodMapClient />
            <p className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-3">
              Source: Queensland Government 2011 flood data · DEQODE EARTH
              analysis cache
            </p>
          </div>
        </section>

        {/* ── 5. Policy brief ──────────────────────────────────────── */}
        <section className="w-full border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              <div>
                <h2 className="font-syne text-2xl lg:text-3xl font-semibold text-[var(--text)] leading-snug">
                  Why Grantham Matters for Pacific Displacement
                </h2>
              </div>
              <div className="space-y-5">
                <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
                  The Grantham buy-back program represents the only operational
                  example of a government relocating an entire community from
                  flood risk at scale. The QRA spent approximately AUD $5.6
                  million to permanently acquire ~160 properties and resettle
                  residents on higher ground — a decision made within 18 months
                  of the flood.
                </p>
                <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
                  For Pacific SIDS — Tuvalu, Kiribati, Marshall Islands —
                  managed retreat is not a policy option but an inevitability.
                  Rising sea levels will render large portions of these atolls
                  uninhabitable within decades. The Grantham model provides the
                  closest available legal, social, and financial precedent.
                </p>
                <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
                  Key lessons: community consent requires early and sustained
                  engagement; legal framework must precede buy-back offers;
                  relocation must offer genuine equivalence in land quality;
                  social cohesion is the hardest variable to preserve.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. COPRRRA context block ─────────────────────────────── */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <div className="border-l-2 border-[var(--gold)] bg-surface/60 rounded rounded-l-none px-8 py-6">
              <p className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--gold)] mb-3">
                COPRRRA Symposium · Day 2 Field Trip
              </p>
              <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
                On 3 September 2026, COPRRRA delegates will visit Grantham
                township as part of the symposium program. This page provides
                the data and policy context for that visit. The DEQODE EARTH
                analysis platform is being demonstrated at the symposium on 2
                September 2026.
              </p>
            </div>
          </div>
        </section>
      </main>

      <StatusStrip demoMode />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({
  number,
  label,
  numberColor,
}: {
  number: string;
  label: string;
  numberColor: string;
}) {
  return (
    <div className="bg-surface/60 border border-[var(--border)] rounded p-5">
      <p className={`font-syne text-3xl font-semibold ${numberColor}`}>
        {number}
      </p>
      <p className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mt-1">
        {label}
      </p>
    </div>
  );
}

function TimelineNode({
  year,
  desc,
  isFirst = false,
  isLast = false,
  isActive = false,
}: {
  year: string;
  desc: string;
  isFirst?: boolean;
  isLast?: boolean;
  isActive?: boolean;
}) {
  const dotColor = isActive ? "bg-[var(--gold)]" : "bg-teal";
  const yearColor = isActive
    ? "text-[var(--gold)]"
    : "text-[var(--text-dim)]";
  void isFirst;
  void isLast;

  return (
    <div className="flex flex-col lg:flex-1 relative group">
      {/* Dot */}
      <div className="flex items-center mb-3 lg:mb-4">
        <span
          className={`w-2 h-2 rounded-full ${dotColor} shrink-0`}
        />
      </div>
      {/* Year */}
      <p
        className={`font-mono text-[0.55rem] tracking-[0.18em] uppercase ${yearColor} mb-2`}
      >
        {year}
      </p>
      {/* Description */}
      <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed pr-4">
        {desc}
      </p>
    </div>
  );
}

function TimelineDivider() {
  return (
    <div className="hidden lg:flex items-start pt-1 px-2">
      <div className="h-px w-8 bg-teal/30 mt-[3px]" />
    </div>
  );
}
