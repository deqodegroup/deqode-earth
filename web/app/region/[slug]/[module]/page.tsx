import { notFound } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { CoastlineModule } from "@/components/modules/coastline/CoastlineModule";
import type { Metadata } from "next";

const VALID_MODULES = ["coastline", "ocean", "reef", "land", "climate", "displacement"];

interface Props {
  params: Promise<{ slug: string; module: string }>;
}

export async function generateStaticParams() {
  return REGION_LIST.flatMap((r) =>
    VALID_MODULES.map((mod) => ({ slug: r.slug, module: mod }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, module: mod } = await params;
  const region = getRegion(slug);
  if (!region) return {};
  return {
    title: `${region.name} · ${mod.charAt(0).toUpperCase() + mod.slice(1)} — DEQODE EARTH`,
  };
}

export default async function ModulePage({ params }: Props) {
  const { slug, module: mod } = await params;
  const region = getRegion(slug);
  if (!region || !VALID_MODULES.includes(mod)) notFound();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main
        className="flex-1 overflow-auto"
        style={{ paddingTop: "var(--bar-height)", paddingBottom: "var(--strip-height)" }}
      >
        {mod === "coastline" && region.isLive && (
          <CoastlineModule loc={region as any} />
        )}
        {mod === "coastline" && !region.isLive && (
          <div className="max-w-2xl mx-auto px-16 py-20 text-center">
            <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-4">
              Analysis Pending
            </div>
            <h1 className="font-display text-3xl text-[var(--text)]">
              {region.name} — Coastline Module
            </h1>
            <p className="font-sans text-sm text-[var(--text-mid)] mt-4">
              Data ingestion in progress. This region will be activated shortly.
            </p>
          </div>
        )}
        {mod !== "coastline" && (
          <div className="max-w-2xl mx-auto px-16 py-20 text-center">
            <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-4">
              Module In Development
            </div>
            <h1 className="font-display text-3xl text-[var(--text)]">
              {region.name} · {mod.charAt(0).toUpperCase() + mod.slice(1)} Intelligence
            </h1>
          </div>
        )}
      </main>
      <StatusStrip />
    </div>
  );
}
