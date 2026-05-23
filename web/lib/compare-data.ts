/**
 * Server-side data fetchers for the Compare View page.
 *
 * Why direct Supabase calls (not internal HTTP to /api/*):
 * - Compare page is a React Server Component; calling `fetch('/api/...')`
 *   from a server component requires a fully-qualified absolute URL and
 *   adds an extra hop. Hitting Supabase directly is faster and avoids
 *   base-URL configuration at build time (generateStaticParams).
 * - The existing /api/displacement and /api/flood-depth routes remain
 *   in use by client-side IntelligencePanel. This module duplicates only
 *   the necessary query/derivation logic; both stay in sync via tests.
 *
 * See: web/app/api/displacement/route.ts and web/app/api/flood-depth/route.ts
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Region } from "@/lib/regions";

export interface DisplacementData {
  total_displaced: number;
  trend: { year: number; net_migration: number }[];
  annual_avg: number | null;
}

export interface FloodDepthData {
  depth_m: number | null;
  source: string;
  return_period?: number;
}

/**
 * Mirrors IntelligencePanel.SLUG_TO_COUNTRY (lines 16–27). Must stay in sync.
 */
const SLUG_TO_ISO2: Record<string, string> = {
  niue: "NU",
  tuvalu: "TV",
  kiribati: "KI",
  "marshall-islands": "MH",
  fiji: "FJ",
  vanuatu: "VU",
  "solomon-islands": "SB",
  palau: "PW",
  brisbane: "AU",
  grantham: "AU",
};

export async function fetchDisplacementForRegion(
  region: Region
): Promise<DisplacementData | null> {
  const iso2 = SLUG_TO_ISO2[region.slug];
  if (!iso2) return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("displacement_records")
      .select(
        "source, country_code, country_name, year, event_date, cause, displaced_count, net_migration, population, data_type"
      )
      .eq("country_code", iso2)
      .order("year", { ascending: false });

    if (error || !data) return null;

    const rows = data as Record<string, unknown>[];
    const events = rows.filter((r) => r.data_type === "event");
    const total_displaced = events.reduce(
      (sum, r) => sum + ((r.displaced_count as number) || 0),
      0
    );

    const trend = rows
      .filter(
        (r) => r.data_type === "annual" && r.net_migration !== null
      )
      .map((r) => ({
        year: r.year as number,
        net_migration: r.net_migration as number,
      }))
      .sort((a, b) => a.year - b.year);

    const annual_avg =
      trend.length > 0
        ? Math.round(
            trend.reduce((s, t) => s + t.net_migration, 0) / trend.length
          )
        : null;

    return { total_displaced, trend, annual_avg };
  } catch {
    return null;
  }
}

export async function fetchFloodDepthForRegion(
  region: Region
): Promise<FloodDepthData | null> {
  try {
    const supabase = createSupabaseAdminClient();

    // Brisbane / Grantham: JRC GloFAS 100yr depth from analysis_cache
    if (region.slug === "brisbane" || region.slug === "grantham") {
      const { data, error } = await supabase
        .from("analysis_cache")
        .select("result, completed_at, status")
        .eq("region_slug", region.slug)
        .eq("analysis_type", "flood_depth")
        .eq("status", "complete")
        .limit(10);

      if (error || !data) return null;

      const rows = data as {
        result: { depth_m?: number; return_period?: number; source?: string } | null;
        completed_at: string;
      }[];
      const match = rows.find((row) => row.result?.return_period === 100);
      if (!match || !match.result) return null;

      return {
        depth_m: match.result.depth_m ?? null,
        source: match.result.source ?? "jrc_glofas",
        return_period: 100,
      };
    }

    // Pacific SIDS: Deltares coastal depth (current scenario)
    const { data, error } = await supabase
      .from("flood_forecasts")
      .select("coastal_depth_m, scenario, forecast_date, source")
      .eq("source", "deltares")
      .order("forecast_date", { ascending: false })
      .limit(50);

    if (error || !data) return null;

    const forecastRows = data as Record<string, unknown>[];
    const match = forecastRows.find((row) => row.scenario === "current");
    if (!match) return null;

    return {
      depth_m: (match.coastal_depth_m as number) ?? null,
      source: "deltares",
    };
  } catch {
    return null;
  }
}

/**
 * Risk score derivation — mirrors IntelligencePanel.deriveScore (lines 48–73).
 * Brisbane/Grantham: depth-based bands. SIDS: displacement-count bands.
 */
export function deriveCompareScore(
  region: Region,
  displacement: DisplacementData | null,
  floodDepth: FloodDepthData | null
): number {
  if (region.slug === "brisbane" || region.slug === "grantham") {
    const d = floodDepth?.depth_m;
    if (d != null) {
      if (d > 5) return 80;
      if (d > 3) return 65;
      if (d > 1) return 50;
      return 40;
    }
    return 50;
  }
  const n = displacement?.total_displaced ?? 0;
  if (n > 10000) return 85;
  if (n > 1000) return 70;
  if (n > 100) return 55;
  return 40;
}
