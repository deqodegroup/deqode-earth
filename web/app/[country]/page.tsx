import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav/TopNav";
import { CountryHero } from "@/components/dashboard/CountryHero";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
import { LOCATIONS, LOCATIONS_LIST } from "@/lib/locations";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return LOCATIONS_LIST.map((loc) => ({ country: loc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const loc = LOCATIONS[country];
  if (!loc) return {};
  return {
    title: `${loc.name} — DEQODE EARTH`,
    description: `Sovereign intelligence for ${loc.name}: coastline, ocean, reef, and land monitoring.`,
  };
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params;
  const loc = LOCATIONS[country];
  if (!loc) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-ocean">
      <TopNav />
      <CountryHero loc={loc} />
      <ModuleGrid loc={loc} />
    </div>
  );
}
