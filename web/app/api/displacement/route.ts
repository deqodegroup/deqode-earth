import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const country = searchParams.get("country");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!country) {
    return NextResponse.json(
      { error: "country (ISO2) required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("displacement_records")
    .select(
      "source, country_code, country_name, year, event_date, cause, displaced_count, net_migration, population, data_type"
    )
    .eq("country_code", country.toUpperCase())
    .order("year", { ascending: false });

  if (from) {
    query = query.gte("event_date", from);
  }
  if (to) {
    query = query.lte("event_date", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  const events = rows.filter((r) => r.data_type === "event");
  const totalDisplaced = events.reduce(
    (sum, r) => sum + ((r.displaced_count as number) || 0),
    0
  );

  const trend = rows
    .filter((r) => r.data_type === "annual" && r.net_migration !== null)
    .map((r) => ({ year: r.year, net_migration: r.net_migration }))
    .sort(
      (a, b) => ((a.year as number) ?? 0) - ((b.year as number) ?? 0)
    );

  return NextResponse.json({
    country: country.toUpperCase(),
    events,
    total_displaced: totalDisplaced,
    trend,
  });
}
