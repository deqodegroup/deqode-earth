import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { fetchDtmDisplacement, SLUG_TO_ISO3 } from "@/lib/dtm";
import {
  fetchDisplacementForRegion,
  fetchFloodDepthForRegion,
} from "@/lib/compare-data";
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

  const iso3 = SLUG_TO_ISO3[originRegion.slug];

  // Parallel fetch — see RESEARCH.md "Pattern 1: Server Component with Parallel Data Fetching"
  const [dtm, originDisplacement, destFloodDepth] = await Promise.all([
    iso3 ? fetchDtmDisplacement(iso3) : Promise.resolve(null),
    fetchDisplacementForRegion(originRegion),
    fetchFloodDepthForRegion(destRegion),
  ]);

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
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
          originDisplacement={originDisplacement}
          destFloodDepth={destFloodDepth}
        />
      </main>
      <StatusStrip />
    </div>
  );
}
