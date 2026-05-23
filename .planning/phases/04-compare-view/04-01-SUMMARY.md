---
phase: 04-compare-view
plan: "01"
subsystem: ui
tags: [nextjs, leaflet, vitest, tailwind, compare-view, dtm, react-server-components]

# Dependency graph
requires:
  - phase: 02-region-intelligence
    provides: Region type, REGIONS map, getRegion, REGION_LIST, RegionTypeBadge
  - phase: 03-brisbane-pipeline
    provides: Supabase displacement_records (fallback data source for DTM)
provides:
  - Compare route shell at /compare/[origin]/[dest] with two-panel layout
  - CompareLayout server component (header + two panels + divider)
  - CompareHeader with IOM DTM / IDMC source attribution
  - ComparePanel with mini-map, region badge, 3 module placeholder slots
  - PanelDivider 1px teal/30 → border → gold/30 gradient
  - CompareMiniMap + CompareMiniMapClient (raw Leaflet, all interactions disabled)
  - web/lib/dtm.ts fetchDtmDisplacement + DtmResult + SLUG_TO_ISO3
  - Wave 0 test suite: 3 files, 8 new test cases, all GREEN
affects: [04-02-compare-data-modules, 05-coastline-algorithm]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CompareMiniMap mirrors MapCanvas isolated-ref pattern (no forwardRef needed — static context map)
    - ComparePanel slot pattern: children prop lets 04-02 inject real data modules against stable shell
    - DTM fetcher returns null on any failure — callers fall back to IDMC without error state
    - vitest @/ path alias via resolve.alias in vitest.config.ts

key-files:
  created:
    - web/lib/dtm.ts
    - web/components/compare/CompareLayout.tsx
    - web/components/compare/CompareHeader.tsx
    - web/components/compare/ComparePanel.tsx
    - web/components/compare/PanelDivider.tsx
    - web/components/compare/CompareMiniMap.tsx
    - web/components/compare/CompareMiniMapClient.tsx
    - web/app/compare/[origin]/[dest]/page.tsx
    - web/lib/__tests__/dtm.test.ts
    - web/components/compare/__tests__/CompareLayout.test.ts
    - web/app/compare/[origin]/[dest]/__tests__/page.test.ts
  modified:
    - web/vitest.config.ts

key-decisions:
  - "vitest @/ alias added to vitest.config.ts (resolve.alias) — existing tests used relative imports but new compare tests needed @/ for cross-directory imports"
  - "CompareMiniMap built as separate component (not reusing MapCanvas) per UI-SPEC — static context maps need no flyTo handle or interaction support"
  - "ComparePanel slot pattern: children prop is undefined in 04-01, placeholder pulse divs render; 04-02 passes real module components"
  - "DTM fetch placed in page.tsx (server component) not CompareLayout — cleaner data/render separation"

patterns-established:
  - "Slot pattern: ComparePanel children prop = stable contract for 04-02 data modules"
  - "Null-safe DTM: fetchDtmDisplacement returns null on any failure, header renders IDMC fallback copy"
  - "Mini-map isolation: CompareMiniMapClient (dynamic ssr:false) wraps CompareMiniMap (raw Leaflet) — same pattern as MapCanvasClient/MapCanvas"

requirements-completed: ["EARTH-13"]

# Metrics
duration: 4min
completed: 2026-05-23
---

# Phase 4 Plan 01: Compare Route + Layout Shell Summary

**Two-panel compare shell at /compare/[origin]/[dest] with IOM DTM fetcher, teal/gold gradient divider, static Leaflet mini-maps, and 8 Wave 0 tests all GREEN**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-23T23:12:00Z
- **Completed:** 2026-05-23T23:15:38Z
- **Tasks:** 6
- **Files modified:** 12 (11 created, 1 modified)

## Accomplishments

- Compare route `/compare/[origin]/[dest]` with `generateStaticParams` producing 16 combos (8 SIDS × 2 AU destinations), `notFound()` on invalid slugs
- Full compare shell: CompareHeader (teal/gold region names + DTM count) + ComparePanel × 2 (mini-maps + module slot placeholders) + PanelDivider (teal/30 → gold/30 gradient) + CommandBar + StatusStrip
- IOM DTM v3.0 fetcher (`web/lib/dtm.ts`) with `SLUG_TO_ISO3` for all 8 SIDS, graceful null on any failure
- CompareMiniMap (raw Leaflet, all interactions disabled) + CompareMiniMapClient (dynamic ssr:false wrapper)
- 35 total tests passing (8 new compare + 27 existing), TypeScript clean

## Task Commits

1. **Task 1: Wave 0 failing tests** - `17f40e9` (test)
2. **Task 2: web/lib/dtm.ts** - `68a713d` (feat)
3. **Task 3: CompareMiniMap + CompareMiniMapClient** - `853c076` (feat)
4. **Task 4: PanelDivider** - `6f0316b` (feat)
5. **Task 5: CompareHeader + ComparePanel** - `97d890b` (feat)
6. **Task 6: CompareLayout + route page + vitest alias fix** - `f0427c1` (feat)

## Files Created/Modified

- `web/lib/dtm.ts` — IOM DTM v3.0 fetcher, DtmResult interface, SLUG_TO_ISO3 map
- `web/components/compare/CompareLayout.tsx` — server component composing header + panels + divider
- `web/components/compare/CompareHeader.tsx` — back nav + region names (teal/gold) + DTM count display
- `web/components/compare/ComparePanel.tsx` — single panel column, side prop drives accent + bg, mini-map + slot children
- `web/components/compare/PanelDivider.tsx` — 1px teal/30 → border → gold/30 vertical gradient, server component
- `web/components/compare/CompareMiniMap.tsx` — raw Leaflet client component, all interactions disabled
- `web/components/compare/CompareMiniMapClient.tsx` — dynamic ssr:false wrapper with pulse loading placeholder
- `web/app/compare/[origin]/[dest]/page.tsx` — route with generateStaticParams, notFound, DTM fetch
- `web/lib/__tests__/dtm.test.ts` — 4 tests: null on no key, non-200, success with DtmResult, network throw
- `web/components/compare/__tests__/CompareLayout.test.ts` — export shape + Region props type contract
- `web/app/compare/[origin]/[dest]/__tests__/page.test.ts` — slug resolution, notFound trigger, static params combos
- `web/vitest.config.ts` — added resolve.alias for @/ path

## Decisions Made

- vitest.config.ts needed `resolve.alias: { '@': path.resolve(__dirname, '.') }` — the new compare tests use `@/lib/regions` and `@/components/compare/CompareLayout` cross-directory; existing tests used relative imports and didn't expose this gap.
- CompareMiniMap built as a new component (not MapCanvas fork) — static context maps need no `flyTo` handle or `forwardRef`, simpler to build fresh per UI-SPEC requirement.
- `children` slot on ComparePanel is the stable interface for Plan 04-02 — when `children` is undefined, three placeholder pulse divs render; 04-02 passes real `DisplacementModule`, `TrendModule`, `CoastlineStatusModule` etc.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @/ path alias to vitest.config.ts**
- **Found during:** Task 6 (full test suite run)
- **Issue:** vitest.config.ts had no path alias; new tests using `@/lib/regions` and `@/components/compare/CompareLayout` failed to resolve — `Cannot find package '@/lib/regions'`
- **Fix:** Added `resolve: { alias: { '@': path.resolve(__dirname, '.') } }` to vitest.config.ts
- **Files modified:** `web/vitest.config.ts`
- **Verification:** All 35 tests pass after fix
- **Committed in:** `f0427c1` (Task 6 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required fix — vitest cannot resolve @/ without explicit alias. No scope creep.

## Issues Encountered

None beyond the vitest alias gap documented above.

## Known Stubs

- `ComparePanel` children slot renders 3 `animate-pulse` placeholder divs (compare-module-slot-1/2/3) when no children passed — Plan 04-02 wires real data modules into these slots. Intentional by plan design.
- `fallbackDisplaced` prop on `CompareLayout` and `CompareHeader` is always `null` in this plan — Plan 04-02 fetches real IDMC displacement counts from Supabase.
- `CompareHeader` DTM count shows "No displacement records in database" because both `dtm` and `fallbackDisplaced` are null — will be populated in 04-02.

## User Setup Required

None — no external service configuration required for this plan. `DTM_API_KEY` env var is optional (fetcher returns null gracefully without it).

## Next Phase Readiness

- Compare shell is complete and stable — 04-02 can import ComparePanel and pass real data modules as `children`
- DTM fetcher is ready — 04-02 can pass a real `fallbackDisplaced` value from `/api/displacement?country=...`
- All component interfaces are locked — CompareHeader props, ComparePanel slot pattern, PanelDivider (no props)
- TypeScript clean, 35 tests passing

---
*Phase: 04-compare-view*
*Completed: 2026-05-23*
