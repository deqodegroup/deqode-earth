import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ country: string }>;
}

export default async function LegacyCoastlinePage({ params }: Props) {
  const { country } = await params;
  redirect(`/region/${country}/coastline`);
}
