import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { fetchDtmDisplacement, SLUG_TO_ISO3 } from "@/lib/dtm";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { CompareLayout } from "@/components/compare/CompareLayout";

interface Props {
  params: Promise<{ origin: string; dest: string }>;
}

export async function generateStaticParams() {
  const sids = REGION_LIST.filter((r) => r.regionType === "sids");
  const destinations = REGION_LIST.filter(
    (r) => r.regionType === "urban_flood" || r.regionType === "managed_retreat"
  );
  return sids.flatMap((o) =>
    destinations.map((d) => ({ origin: o.slug, dest: d.slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { origin, dest } = await params;
  const originRegion = getRegion(origin);
  const destRegion = getRegion(dest);
  if (!originRegion || !destRegion) return {};
  return {
    title: `${originRegion.name} vs ${destRegion.name} — DEQODE EARTH`,
    description: `Side-by-side climate displacement comparison: ${originRegion.name} (origin) vs ${destRegion.name} (destination).`,
  };
}

export default async function ComparePage({ params }: Props) {
  const { origin, dest } = await params;
  const originRegion = getRegion(origin);
  const destRegion = getRegion(dest);
  if (!originRegion || !destRegion) notFound();

  // Plan 04-01: DTM fetch + fallback wired here. Plan 04-02 adds the
  // per-panel data module fetches (displacement, flood depth) into the
  // ComparePanel children prop.
  const iso3 = SLUG_TO_ISO3[originRegion.slug];
  const dtm = iso3 ? await fetchDtmDisplacement(iso3) : null;

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100dvh" }}
    >
      <CommandBar />
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          paddingTop: "var(--bar-height)",
          paddingBottom: "var(--strip-height)",
        }}
      >
        <CompareLayout
          origin={originRegion}
          dest={destRegion}
          dtm={dtm}
          fallbackDisplaced={null}
        />
      </main>
      <StatusStrip demoMode />
    </div>
  );
}
