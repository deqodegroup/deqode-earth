import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("data_source_health")
    .select(
      "source, display_name, cadence, status, last_attempt_at, last_success_at, consecutive_failures"
    )
    .order("display_name");

  if (error) {
    return NextResponse.json(
      { error: "Data health is temporarily unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    sources: data ?? [],
  });
}
