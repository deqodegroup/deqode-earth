---
phase: 04-compare-view
plan: "02"
subsystem: ui
tags: [nextjs, supabase, compare-view, data-modules, server-components, vitest]

# Dependency graph
requires:
  - phase: 04-01
    provides: CompareLayout shell, ComparePanel slot pattern, CompareHeader, PanelDivider, CompareMiniMap, dtm.ts
  - phase: 03-brisbane-pipeline
    provides: displacement_records table, analysis_cache table, flood_forecasts table, createSupabaseAdminClient
provides:
  - compare-data.ts — fetchDisplacementForRegion, fetchFloodDepthForRegion, deriveCompareScore
  - DisplacementModule — font-display 28px teal, null-safe, toLocaleString
  - TrendModule — directional coral/teal color from annual_avg
  - CoastlineStatusModule — static link to /region/{slug}/coastline
  - FloodRiskModule — deriveCompareScore gold score, 100yr label
  - FloodDepthModule — depth.toFixed(1) + 'm' unit, null-safe
  - FloodZoneModule — RegionTypeBadge urban_flood + static copy
  - CompareLayout updated — all 6 modules wired into ComparePanel children slots
  - page.tsx updated — Promise.all parallel fetch (dtm + displacement + flood depth)
affects: [05-coastline-algorithm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server component data modules — no 'use client', props flow from page.tsx
    - direct Supabase calls in server components — faster than internal /api/* fetch
    - dynamic='force-dynamic' on API routes replaces revalidate=3600 — prevents build-time Supabase init

key-files:
  created:
    - web/lib/compare-data.ts
    - web/lib/__tests__/compare-data.test.ts
    - web/components/compare/DisplacementModule.tsx
    - web/components/compare/TrendModule.tsx
    - web/components/compare/CoastlineStatusModule.tsx
    - web/components/compare/FloodRiskModule.tsx
    - web/components/compare/FloodDepthModule.tsx
    - web/components/compare/FloodZoneModule.tsx
  modified:
    - web/components/compare/CompareLayout.tsx
    - web/app/compare/[origin]/[dest]/page.tsx
    - web/app/api/countries/route.ts
    - web/app/api/displacement/route.ts
    - web/app/api/flood-depth/route.ts
    - web/app/api/flood-zones/route.ts
    - web/app/api/forecasts/open-meteo/route.ts

key-decisions:
  - "direct Supabase calls in compare-data.ts (not internal /api/* HTTP) — server component + build-time generateStaticParams cannot use relative fetch; admin client call is faster and avoids base-URL config"
  - "dynamic='force-dynamic' on all Supabase API routes — revalidate=3600 caused Next.js to prerender API routes at build time without env vars; force-dynamic keeps routes server-rendered on demand"
  - "deriveCompareScore mirrors IntelligencePanel score bands exactly — same thresholds (depth: 5/3/1m → 80/65/50/40; displaced: 10k/1k/100 → 85/70/55/40) to ensure consistent risk display across views"

# Metrics
duration: 6min
completed: 2026-05-24
---

# Phase 4 Plan 02: Data Wiring + 6 Data Modules Summary

**Server-side displacement + flood depth fetchers wired into CompareLayout with 6 teal/gold data module components — Promise.all parallel fetch, 41 tests GREEN, build clean**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-23T23:19:06Z
- **Completed:** 2026-05-24T09:24:48Z
- **Tasks:** 3
- **Files modified:** 15 (8 created, 7 modified)

## Accomplishments

- `web/lib/compare-data.ts`: server-side Supabase admin fetchers — `fetchDisplacementForRegion` (displacement_records), `fetchFloodDepthForRegion` (analysis_cache for Brisbane/Grantham GloFAS, flood_forecasts for SIDS Deltares), `deriveCompareScore` mirroring IntelligencePanel bands
- 6 pure-logic tests for `deriveCompareScore` — Brisbane depth bands + SIDS displacement bands, all GREEN
- 6 data module server components with exact UI-SPEC treatment: teal left panel (DisplacementModule, TrendModule, CoastlineStatusModule), gold right panel (FloodRiskModule, FloodDepthModule, FloodZoneModule)
- All modules: `borderLeftColor` accent, 3% opacity tint, `animate-float-up` with staggered delays (0.05s/0.12s/0.19s), `card-glow-teal`/`card-glow-gold`
- CompareLayout updated: imports all 6 modules, passes children to both ComparePanel instances, derives `fallbackDisplaced` from `originDisplacement?.total_displaced`
- page.tsx updated: `Promise.all([dtm, fetchDisplacementForRegion(originRegion), fetchFloodDepthForRegion(destRegion)])` — parallel server fetch
- 41 total tests passing (8 test files), TypeScript clean, build exits 0

## Task Commits

1. **Task 1: compare-data.ts + tests** - `c8a27ce` (feat)
2. **Task 2: 6 data module components** - `a1685f0` (feat)
3. **Task 3: CompareLayout + page.tsx wiring + API route fix** - `aad05b8` (feat)

## Files Created/Modified

**Created:**
- `web/lib/compare-data.ts` — fetchDisplacementForRegion, fetchFloodDepthForRegion, deriveCompareScore, DisplacementData, FloodDepthData interfaces
- `web/lib/__tests__/compare-data.test.ts` — 6 deriveCompareScore tests
- `web/components/compare/DisplacementModule.tsx` — left module 1, teal, toLocaleString
- `web/components/compare/TrendModule.tsx` — left module 2, coral/teal directional color
- `web/components/compare/CoastlineStatusModule.tsx` — left module 3, static link
- `web/components/compare/FloodRiskModule.tsx` — right module 1, gold, deriveCompareScore
- `web/components/compare/FloodDepthModule.tsx` — right module 2, depth.toFixed(1)
- `web/components/compare/FloodZoneModule.tsx` — right module 3, RegionTypeBadge + static copy

**Modified:**
- `web/components/compare/CompareLayout.tsx` — all 6 module imports + children into both panels
- `web/app/compare/[origin]/[dest]/page.tsx` — Promise.all parallel fetch, new props
- `web/app/api/countries/route.ts` — revalidate→dynamic='force-dynamic'
- `web/app/api/displacement/route.ts` — revalidate→dynamic='force-dynamic'
- `web/app/api/flood-depth/route.ts` — revalidate→dynamic='force-dynamic'
- `web/app/api/flood-zones/route.ts` — revalidate→dynamic='force-dynamic'
- `web/app/api/forecasts/open-meteo/route.ts` — revalidate→dynamic='force-dynamic'

## Decisions Made

- Direct Supabase admin client in compare-data.ts (not internal /api/* HTTP) — server components can't use relative fetch at build time; admin call eliminates an extra network hop.
- `dynamic='force-dynamic'` replaces `revalidate=3600` on all Supabase API routes — prevents build-time initialization failure when env vars aren't present during CI/local builds.
- `deriveCompareScore` is a shared pure function (compare-data.ts) tested independently — keeps score logic consistent across IntelligencePanel (client) and CompareView (server) without duplication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] API routes with revalidate=3600 caused build failure**
- **Found during:** Task 3 (npm run build gate)
- **Issue:** Next.js tried to statically prerender 5 API routes (`/api/countries`, `/api/displacement`, `/api/flood-depth`, `/api/flood-zones`, `/api/forecasts/open-meteo`) at build time. Each calls `createSupabaseAdminClient()` which throws `supabaseUrl is required` without env vars.
- **Fix:** Replaced `export const revalidate = 3600` with `export const dynamic = "force-dynamic"` on all 5 routes — forces server-rendering on demand, no build-time Supabase init
- **Files modified:** 5 API routes listed above
- **Commit:** `aad05b8` (included in Task 3 commit)

No other deviations — plan executed as written for all task content.

## Known Stubs

- `CoastlineStatusModule`: renders a static link to `/region/{slug}/coastline`. Phase 5 will hydrate this with real coastline change metrics. Intentional per plan — Phase 4 = static link only.
- `FloodZoneModule`: renders "High-density residential zone" as static copy. BCC FeatureServer area total not yet surfaced to API. Phase 5+ will add real zone area data. Intentional per plan.
- `FloodDepthModule` and `FloodRiskModule`: will show "No depth data" / fallback score of 50 if `analysis_cache` has no Brisbane GloFAS 100yr entry. This is correct null-safe behavior; not a stub — data will populate when ingestion pipelines run.

## Self-Check

---

## Self-Check: PASSED

**Files checked:**
- `web/lib/compare-data.ts` — FOUND
- `web/lib/__tests__/compare-data.test.ts` — FOUND
- `web/components/compare/DisplacementModule.tsx` — FOUND
- `web/components/compare/TrendModule.tsx` — FOUND
- `web/components/compare/CoastlineStatusModule.tsx` — FOUND
- `web/components/compare/FloodRiskModule.tsx` — FOUND
- `web/components/compare/FloodDepthModule.tsx` — FOUND
- `web/components/compare/FloodZoneModule.tsx` — FOUND
- `web/components/compare/CompareLayout.tsx` — FOUND (updated)
- `web/app/compare/[origin]/[dest]/page.tsx` — FOUND (updated)

**Commits checked:**
- `c8a27ce` — feat(04-02): compare-data.ts + tests
- `a1685f0` — feat(04-02): 6 data module components
- `aad05b8` — feat(04-02): CompareLayout + page.tsx wiring

**Verification gates:**
- `npm run test` — 41/41 pass (8 test files)
- `npx tsc --noEmit` — 0 errors
- `npm run build` — exits 0
