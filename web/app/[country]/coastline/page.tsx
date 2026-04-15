import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/nav/TopNav";
import { CoastlineModule } from "@/components/modules/coastline/CoastlineModule";
import { LOCATIONS, LOCATIONS_LIST } from "@/lib/locations";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return LOCATIONS_LIST.filter((l) => l.isLive).map((loc) => ({ country: loc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const loc = LOCATIONS[country];
  if (!loc) return {};
  return { title: `${loc.name} — Coastline Intelligence — DEQODE EARTH` };
}

export default async function CoastlinePage({ params }: Props) {
  const { country } = await params;
  const loc = LOCATIONS[country];
  if (!loc || !loc.isLive) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-ocean">
      <TopNav />

      {/* Breadcrumb */}
      <div className="border-b border-[var(--border)] px-16 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.12em] uppercase">
          <Link href="/" className="text-[var(--text-dim)] hover:text-teal transition-colors">
            Earth
          </Link>
          <span className="text-[var(--text-dim)]">/</span>
          <Link href={`/${loc.slug}`} className="text-[var(--text-dim)] hover:text-teal transition-colors">
            {loc.flag} {loc.name}
          </Link>
          <span className="text-[var(--text-dim)]">/</span>
          <span className="text-teal">Coastline</span>
        </div>
      </div>

      {/* Module header */}
      <section className="border-b border-[var(--border)] px-16 py-8 bg-surface/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 50% 120% at 0% 50%, rgba(76,185,192,0.05) 0%, transparent 60%)" }} />
        <div className="max-w-[1440px] mx-auto flex items-start justify-between gap-6 flex-wrap relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xl text-teal glow-text-teal">◎</span>
              <h1 className="font-display text-2xl text-[var(--text)]">
                Coastline Intelligence
              </h1>
            </div>
            <p className="font-sans text-sm text-[var(--text-mid)] max-w-lg leading-relaxed">
              Sentinel-2 optical shoreline change analysis using NDWI water index
              composites. Quantifies erosion, accretion, and net coastal displacement
              over multi-year periods.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-right">
            <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)]">
              Territory
            </div>
            <div className="font-sans text-sm font-medium text-[var(--text)]">
              {loc.flag} {loc.name}
            </div>
            <div className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-dim)]">
              {loc.coords} · EEZ {loc.eez}
            </div>
          </div>
        </div>
      </section>

      {/* Analysis panel */}
      <main className="max-w-[1440px] mx-auto px-16 py-10 w-full flex-1">
        <CoastlineModule loc={loc} />
      </main>
    </div>
  );
}
