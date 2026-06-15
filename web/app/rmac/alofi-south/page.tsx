import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/get-profile";
import { RMAC_ORG_SLUG, RMAC_REVIEW_ROLES } from "@/lib/rmac/constants";
import { RmacWorkspace } from "@/components/rmac/RmacWorkspace";

export default async function AlofiSouthRmacPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/rmac/alofi-south");
  if (profile.org_slug !== RMAC_ORG_SLUG && profile.role !== "deqode_admin") {
    redirect("/dashboard");
  }

  return (
    <RmacWorkspace
      userEmail={profile.email}
      canReview={RMAC_REVIEW_ROLES.includes(profile.role)}
    />
  );
}

