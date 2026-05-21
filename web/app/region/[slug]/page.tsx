import { notFound, redirect } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return REGION_LIST.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegion(slug);
  if (!region) return {};
  return {
    title: `${region.name} — DEQODE EARTH`,
    description: `Climate displacement intelligence for ${region.name}.`,
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = getRegion(slug);
  if (!region) notFound();

  // Redirect to command center with region pre-selected
  redirect(`/?region=${slug}`);
}
