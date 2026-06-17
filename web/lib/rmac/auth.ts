import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { RMAC_ORG_SLUG } from "@/lib/rmac/constants";

export async function requireRmacUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = data as Profile | null;

  if (
    !profile ||
    profile.invite_status !== "active" ||
    (profile.org_slug !== RMAC_ORG_SLUG && profile.role !== "deqode_admin")
  ) {
    return NextResponse.json({ error: "Alofi South access required." }, { status: 403 });
  }

  return { user, profile };
}

