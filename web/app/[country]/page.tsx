import { redirect } from "next/navigation";
import { REGIONS } from "@/lib/regions";

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return Object.keys(REGIONS).map((slug) => ({ country: slug }));
}

export default async function LegacyCountryPage({ params }: Props) {
  const { country } = await params;
  redirect(`/region/${country}`);
}
