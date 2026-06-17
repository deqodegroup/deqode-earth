import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/get-profile";
import { RMAC_ORG_SLUG } from "@/lib/rmac/constants";
import { RmacInsightsDashboard } from "@/components/rmac/RmacInsightsDashboard";

export default async function AlofiSouthInsightsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/rmac/alofi-south/insights");
  if (profile.org_slug !== RMAC_ORG_SLUG && profile.role !== "deqode_admin") {
    redirect("/dashboard");
  }

  return <RmacInsightsDashboard />;
}
