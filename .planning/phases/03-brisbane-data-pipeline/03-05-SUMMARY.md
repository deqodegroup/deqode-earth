---
phase: 03-brisbane-data-pipeline
plan: 05
subsystem: api
tags: [nextjs, supabase, postgis, displacement, flood-zones, geojson, isr]

requires:
  - phase: 03-01
    provides: flood_zones_in_bbox RPC function, PostGIS schema (4 tables)
  - phase: 03-02
    provides: Brisbane flood ingestion pipeline (BCC, QLD 2011, WMIP gauges)
  - phase: 03-03
    provides: Pacific displacement ingestion (IDMC, World Bank, PDH.stat)
  - phase: 03-04
    provides: Flood depth ingestion (Deltares, JRC GloFAS, Open-Meteo)

provides:
  - Five Next.js API routes serving PostGIS data to frontend
  - /api/flood-zones — GeoJSON FeatureCollection via flood_zones_in_bbox RPC
  - /api/displacement — event records, total_displaced, net_migration trend
  - /api/flood-depth — JRC GloFAS for Brisbane, Deltares coastal for SIDS
  - /api/forecasts/open-meteo — discharge timeseries from flood_forecasts table
  - /api/countries — REGION_LIST + displacement summary stats per country
  - IntelligencePanel wired to real displaced_count and flood depth (replacing STATIC_SCORES)

affects:
  - phase-04-compare-view (uses /api/countries for region list)
  - IntelligencePanel (now fetches live data, not static scores)
  - All future API consumers reading Supabase data

tech-stack:
  added: []
  patterns:
    - createSupabaseAdminClient() reused from web/lib/supabase/admin.ts (service role, no RLS)
    - ISR revalidate=3600 on all public read routes
    - SLUG_TO_COUNTRY mapping for slug→ISO2 lookups in client components
    - useEffect + fetch pattern for client-side data in "use client" panels
    - FALLBACK_SCORES retained as graceful degradation during loading/error

key-files:
  created:
    - web/app/api/flood-zones/route.ts
    - web/app/api/displacement/route.ts
    - web/app/api/flood-depth/route.ts
    - web/app/api/forecasts/open-meteo/route.ts
    - web/app/api/countries/route.ts
  modified:
    - web/components/command/IntelligencePanel.tsx

key-decisions:
  - "Reuse createSupabaseAdminClient() from web/lib/supabase/admin.ts — avoids duplicate createClient() calls"
  - "ISR revalidate=3600 on all 5 routes — data doesn't change more than hourly, reduces Supabase calls"
  - "SLUG_TO_COUNTRY mapping in IntelligencePanel — lib/regions.ts has no country_code field, derived from CONTEXT.md"
  - "Score derived from real data: displacement count or flood depth drives RiskScoreHUD, FALLBACK_SCORES for loading"
  - "flood-depth route handles both Brisbane (analysis_cache) and SIDS (flood_forecasts deltares) from single endpoint"

patterns-established:
  - "Pattern: public read API routes use createSupabaseAdminClient() + ISR revalidate=3600"
  - "Pattern: client-side panel fetches use useEffect on slug change, show Loading... while in flight"
  - "Pattern: graceful degradation — FALLBACK_SCORES shown during API loading, not blank"

requirements-completed:
  - EARTH-12

duration: 25min
completed: 2026-05-22
---

# Phase 3 Plan 05: API Routes and IntelligencePanel Data Wiring Summary

**Five Supabase-backed Next.js API routes + IntelligencePanel wired to real IDMC displacement counts and JRC GloFAS/Deltares flood depth, replacing static mock scores**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-22T09:55:00Z
- **Completed:** 2026-05-22T10:20:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created all 5 API routes serving Supabase PostGIS data with ISR caching (revalidate=3600)
- flood-zones route calls `flood_zones_in_bbox` RPC, returning GeoJSON FeatureCollection
- IntelligencePanel now fetches real displacement counts from `/api/displacement` and flood depth from `/api/flood-depth`, showing "Loading..." during fetch and falling back to FALLBACK_SCORES on error
- TypeScript clean, all 26 existing tests still pass

## Task Commits

1. **Task 1: Five Next.js API routes** - `57ac5a3` (feat)
2. **Task 2: Wire IntelligencePanel to real API data** - `f0fceac` (feat)

## Files Created/Modified

- `web/app/api/flood-zones/route.ts` — GeoJSON FeatureCollection via flood_zones_in_bbox RPC
- `web/app/api/displacement/route.ts` — displacement_records query: events, total_displaced, trend
- `web/app/api/flood-depth/route.ts` — analysis_cache (JRC GloFAS) for Brisbane; flood_forecasts (Deltares) for SIDS
- `web/app/api/forecasts/open-meteo/route.ts` — flood_forecasts discharge timeseries by date range
- `web/app/api/countries/route.ts` — REGION_LIST + per-country displacement summary
- `web/components/command/IntelligencePanel.tsx` — useEffect fetches, SLUG_TO_COUNTRY, two new StatCells

## Decisions Made

- Reused `createSupabaseAdminClient()` from `web/lib/supabase/admin.ts` instead of creating new `createClient()` calls — consistent with project pattern seen in admin routes
- `SLUG_TO_COUNTRY` mapping added to IntelligencePanel because `lib/regions.ts` Region interface has no `country_code` field — derived from CONTEXT.md canonical mapping
- `flood-depth` route handles both Brisbane (analysis_cache lookup by return_period) and SIDS (flood_forecasts deltares lookup by scenario) from a single endpoint to keep frontend fetch logic simple
- Score derivation: displacement > 10k → 85, > 1k → 70, > 100 → 55, else 40; depth > 5m → 80, > 3m → 65, > 1m → 50, else 40; FALLBACK_SCORES used during loading

## Deviations from Plan

None - plan executed exactly as written. The plan code used bare `createClient()` calls but the project already has `createSupabaseAdminClient()` which is the correct project pattern — substituted that without changing API behavior.

## Environment Variables Required in Vercel

- `NEXT_PUBLIC_SUPABASE_URL` — already set (vofpmfxqlflabpdackls.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` — must be set in Vercel for API routes to query Supabase with service access

## Known Stubs

None — all API routes return real data from Supabase. IntelligencePanel shows "No data" (not fake numbers) when no records exist in the DB. The FALLBACK_SCORES are only used during the loading state transient, not as permanent data.

## Issues Encountered

None — TypeScript clean from first write, no compilation errors.

## Next Phase Readiness

- All 5 API routes ready for consumption by Phase 4 (Compare View)
- IntelligencePanel now data-driven — will automatically show real numbers once ingestion pipelines in plans 03-02 through 03-04 have populated the DB
- Environment variable `SUPABASE_SERVICE_ROLE_KEY` must be confirmed set in Vercel before the routes are live

---
*Phase: 03-brisbane-data-pipeline*
*Completed: 2026-05-22*
