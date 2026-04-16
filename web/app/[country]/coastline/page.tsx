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
      <section className="border-b border-[var(--border)] px-16 py-10 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 60% 200% at -5% 50%, rgba(76,185,192,0.08) 0%, transparent 60%)" }} />
        <div className="absolute inset-0 pointer-events-none opacity-20"
             style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(76,185,192,0.06) 0px, rgba(76,185,192,0.06) 1px, transparent 1px, transparent 80px), repeating-linear-gradient(0deg, rgba(76,185,192,0.06) 0px, rgba(76,185,192,0.06) 1px, transparent 1px, transparent 80px)" }} />
        <div className="scan-line" />

        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6 flex-wrap relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-2xl text-teal glow-text-teal" style={{ animation: "earth-orbit 8s linear infinite", display: "inline-block" }}>◎</span>
              <h1 className="font-display text-3xl text-[var(--text)] tracking-wide">
                Coastline Intelligence
              </h1>
              <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase px-2 py-0.5 rounded border border-teal/30 text-teal bg-teal/5">
                Live
              </span>
            </div>
            <p className="font-sans text-sm text-[var(--text-mid)] max-w-xl leading-relaxed">
              Sentinel-2 optical shoreline change analysis · NDWI water index composites ·
              Quantifies erosion, accretion, and net coastal displacement over multi-year periods.
            </p>
          </div>

          {/* Territory block */}
          <div className="rounded-lg border border-[var(--border)] bg-surface/60 px-5 py-4 flex flex-col gap-1 min-w-[200px]">
            <div className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">Territory</div>
            <div className="font-sans text-lg font-medium text-[var(--text)]">{loc.flag} {loc.name}</div>
            <div className="font-mono text-[0.6rem] tracking-[0.1em] text-[var(--text-dim)]">{loc.coords}</div>
            <div className="font-mono text-[0.6rem] tracking-[0.1em] text-[var(--text-dim)]">EEZ {loc.eez}</div>
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
