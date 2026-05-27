---
phase: "05"
plan: "05-02"
subsystem: sids-data-activation
tags: [gee, python, typescript, tdd, slr, cmip6, sids, locations]
dependency_graph:
  requires: [05-01]
  provides: [all-8-sids-live-backend, all-8-sids-live-frontend, slr-exposure-cards, cmip6-temp-cards]
  affects: [web/api/analyse.py, web/lib/locations.ts, web/components/modules/coastline/MetricCards.tsx]
tech_stack:
  added: []
  patterns: [TDD-Red-Green, source-grep-tests, conditional-render-guard, graceful-null-fallback]
key_files:
  created:
    - web/components/modules/coastline/MetricCards.test.ts
  modified:
    - web/api/analyse.py
    - web/lib/locations.ts
    - web/components/modules/coastline/MetricCards.tsx
decisions:
  - "Both gates (analyse.py backend + locations.ts frontend) flipped atomically — avoids split state where backend is live but UI shows pending"
  - "showCMIP6 guard uses typeof === 'number' || === null — explicit null renders the 'No data' card; undefined (legacy) suppresses the card entirely"
  - "SLR card uses md:col-span-2 + CMIP6 uses md:col-span-1 in a 3-column grid — respects existing OKLCH erosion/gold/blue palette, no new colors"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-27"
  tasks_completed: 4
  files_changed: 4
---

# Phase 05 Plan 02: Activate All 8 SIDS + Wire SLR / CMIP6 Cards Summary

**One-liner:** Flipped backend + frontend live gates for 5 SIDS simultaneously and added SLR exposure 3-bar card + CMIP6 temperature delta card with null fallback to MetricCards, completing Phase 5's promise of full Pacific SIDS coverage.

## What Was Built

### Task 1 (Wave 0 Tests) — RED

**`web/components/modules/coastline/MetricCards.test.ts`** — 8 source-grep tests:
- SLR section: heading match, `typeof data.slr_pct_1m === "number"` guard, 1m/2m/5m threshold labels, SRTM disclaimer
- CMIP6 card: conditional render on `data.cmip6_temp_delta_c`, "No data" fallback, SSP585 label, °C unit

All 8 tests RED before MetricCards.tsx update.

### Task 2 (MetricCards.tsx) — GREEN

**`web/components/modules/coastline/MetricCards.tsx`** — Added 3 new subcomponents:

| Component | Purpose |
|---|---|
| `SLRBar` | Single horizontal progress bar — label, clamped pct, accent color |
| `SLRExposureCard` | Container with 3 SLRBars (1m/2m/5m), red left-accent, "Indicative — SRTM 30 m DEM" disclaimer |
| `CMIP6Card` | SSP585 temperature delta with +X.X °C display or "No data" fallback for null |

**Conditional rendering logic:**
```typescript
const showSLR   = typeof data.slr_pct_1m === "number"
               && typeof data.slr_pct_2m === "number"
               && typeof data.slr_pct_5m === "number";
const showCMIP6 = typeof data.cmip6_temp_delta_c === "number" || data.cmip6_temp_delta_c === null;
```

Backwards-compat preserved: legacy 9-field responses (no slr/cmip6 fields) render only the original 4-card grid.

### Task 3 (Backend + Frontend Gate Flip)

**`web/api/analyse.py` LOCATIONS dict** — 5 entries flipped `"live": False` → `"live": True`:
- tuvalu (scale=10, min_area_m2=1000)
- kiribati (scale=10, min_area_m2=1000)
- marshall-islands (scale=10, min_area_m2=1000)
- vanuatu (scale=30, min_area_m2=5000)
- solomon-islands (scale=30, min_area_m2=5000)

Result: `grep "live": True` returns 8, `grep "live": False` returns 0.

**`web/lib/locations.ts` LOCATIONS dict** — Same 5 entries flipped `isLive: false` → `isLive: true`.

Result: `grep isLive: true` returns 8, `grep isLive: false` returns 0.

Consumer components now see all 8 SIDS as live: `StatusStrip`, `CountryGrid`, `CountryHero`, `ModuleGrid`.

## Test Results

- Full vitest suite: 59/59 passing (11 test files)
- MetricCards.test.ts: 8/8 GREEN (Wave 0)
- No regressions introduced

## Deviations from Plan

None — plan executed exactly as written.

## Task 4: Manual Integration Verification — APPROVED

Human verified all 8 SIDS against the live dev server with GEE credentials. Status: **approved**.

Verified:
1. All 8 POST /api/analyse calls returned HTTP 200 (no 400 "is not yet live" errors)
2. Response payloads include `algorithm: "MNDWI+Otsu"`, `slr_pct_1m/2m/5m` as numbers (or null for narrow atolls), `cmip6_temp_delta_c` as number or null
3. Frontend surfaces (StatusStrip, CountryGrid, CountryHero, ModuleGrid) show all 8 countries as live — no "pending" badges
4. CoastlineModule on tuvalu and at least one other newly-activated SIDS rendered SLR exposure bars + CMIP6 card

CMIP6 null slugs: narrow atolls (tuvalu, kiribati, marshall-islands) may return null for `cmip6_temp_delta_c` — this is expected behavior per the graceful-null-fallback design; the CMIP6Card renders "No data" correctly.

## Phase 5 Close Notes

- Phase 6 (Nightly Agent Pipeline) is now unblocked — every SIDS has a real GEE analysis path
- All consumer surfaces of locations.ts (StatusStrip, CountryGrid, CountryHero, ModuleGrid) show 8 live countries
- EARTH-15 requirement satisfied
- LIVE_FIRST sort order in locations.ts is now a no-op (all 8 live) — intended Phase 5 end-state

## Self-Check: PASSED

| Item | Status |
|---|---|
| `web/components/modules/coastline/MetricCards.test.ts` | FOUND (b748f09) |
| `web/components/modules/coastline/MetricCards.tsx` | FOUND — updated (9fb0bca) |
| `web/api/analyse.py` | FOUND — 8 live entries (cf45b43) |
| `web/lib/locations.ts` | FOUND — 8 isLive: true (cf45b43) |
| Commit `b748f09` (Wave 0 tests) | FOUND |
| Commit `9fb0bca` (MetricCards SLR+CMIP6) | FOUND |
| Commit `cf45b43` (backend + frontend gate flip) | FOUND |
| Task 4 human-verify | APPROVED |
| 59/59 vitest tests passing | PASSED |
| Phase 5 complete | YES |
