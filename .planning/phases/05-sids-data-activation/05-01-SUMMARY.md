---
phase: "05"
plan: "05-01"
subsystem: coastline-algorithm
tags: [gee, python, mndwi, otsu, tdd, typescript, sentinel-2]
dependency_graph:
  requires: []
  provides: [mndwi-otsu-algorithm, coastline-metrics-extended, dry-season-compositing, slr-exposure, cmip6-temp-delta]
  affects: [web/api/analyse.py, web/components/modules/coastline/MetricCards.tsx, web/components/modules/coastline/CoastlineModule.tsx]
tech_stack:
  added: [USGS/SRTMGL1_003, NASA/GDDP-CMIP6, Otsu threshold, connected-components]
  patterns: [TDD-Red-Green, pure-helper-mirroring, graceful-null-fallback, per-region-config]
key_files:
  created:
    - web/lib/coastline-metrics.ts
    - web/lib/coastline-metrics.test.ts
    - web/components/modules/coastline/CoastlineModule.test.ts
  modified:
    - web/api/analyse.py
    - web/components/modules/coastline/MetricCards.tsx
    - web/components/modules/coastline/CoastlineModule.tsx
decisions:
  - "scale=10 + min_area_m2=1000 for narrow atolls (tuvalu, kiribati, marshall-islands) to preserve thin coastline features"
  - "SRTM scale fixed at 30m for SLR exposure regardless of per-region analysis scale"
  - "CMIP6 model ACCESS-CM2 with SSP585 scenario for worst-case temperature delta"
  - "Graceful null return on CMIP6 failure — Pitfall 3 (tiny bbox misses 27.5km grid cell)"
  - "selfMask() called before connectedPixelCount to prevent giant land-pixel component passing filter"
  - "Otsu fallback to mndwi > 0 when histogram count < 100 or threshold outside (-0.8, 0.8)"
  - "live flags left UNCHANGED at 3 (niue/palau/fiji) — 05-02 activates the remaining 5 SIDS"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-27"
  tasks_completed: 3
  files_changed: 6
---

# Phase 05 Plan 01: MNDWI + Otsu Coastline Algorithm Fix Summary

**One-liner:** Replaced broken NDWI > 0 algorithm with DEA-Coastlines-standard MNDWI+Otsu+dry-season+connected-components pipeline, extended CoastlineMetrics TypeScript contract with 5 new fields, and surfaced algorithm in UI spec table and sensor badge.

## What Was Built

### Wave 0 Tests Added

**`web/lib/coastline-metrics.test.ts`** — 7 tests:
- 3 type-shape tests: legacy 9-field shape, extended shape (algorithm + slr_pct_* + cmip6_temp_delta_c), and nullable fields
- 4 otsuFallback behavioural tests: sparse histogram (< 100), threshold below -0.8, threshold above 0.8, valid range returns false

**`web/components/modules/coastline/CoastlineModule.test.ts`** — 3 source-grep tests:
- References MNDWI+Otsu in spec table/mission params
- Shows "Dry (May-Oct)" season label
- Sensor badge no longer reads "S2 · NDWI ·"

All 10 new tests GREEN. Full suite: 51/51 tests passing.

### Files Modified

**`web/components/modules/coastline/MetricCards.tsx`** — Extended `CoastlineMetrics` interface with 5 new optional fields:
- `algorithm?: string`
- `slr_pct_1m?: number | null`
- `slr_pct_2m?: number | null`
- `slr_pct_5m?: number | null`
- `cmip6_temp_delta_c?: number | null`

**`web/components/modules/coastline/CoastlineModule.tsx`** — Three updates:
- Mission-params strip: "Index" now shows `data.algorithm ?? "MNDWI+Otsu"` dynamically; new "Season" param shows "Dry (May-Oct)"
- Spec table: Updated to B11/MNDWI+Otsu/dry-season/connected-components rows (< 15% cloud, season filter, Otsu adaptive threshold, 0.5 ha min object, B11 SWIR1 mention)
- Sensor badge: `S2 · {data.algorithm ?? "MNDWI+Otsu"} · 30 m · GEE · ...` (static "S2 · NDWI ·" removed)

**`web/api/analyse.py`** — Full rewrite of `run_analysis()` and helpers:

### New Python Helpers Added

| Helper | Purpose |
|---|---|
| `mndwi_composite(year, aoi)` | Dry-season (May-Oct) MNDWI median composite via calendarRange(5,10) |
| `_otsu_threshold(counts, centers)` | Pure Python Otsu's method on GEE histogram output |
| `_otsu_fallback(threshold, total_count)` | Mirrors TS `otsuFallback()` — graceful fallback to mndwi > 0 |
| `compute_water_mask(mndwi_image, aoi, scale)` | Otsu adaptive threshold with fallback guard |
| `apply_min_area_filter(water_mask, min_area_m2, scale)` | Connected-components 0.5 ha filter (selfMask() pitfall guarded) |
| `compute_slr_exposure(aoi, scale)` | USGS SRTM 1m/2m/5m elevation exposure percentages |
| `compute_cmip6_temp_delta(aoi, model)` | NASA GDDP-CMIP6 SSP585 ACCESS-CM2 2090-2100 vs 2020-2030 delta |

### New TypeScript Helper Added

| Helper | File | Purpose |
|---|---|---|
| `otsuFallback(threshold, histogramTotalCount)` | `web/lib/coastline-metrics.ts` | Pure function mirroring Python `_otsu_fallback()` — both runtimes share identical logic |

### Response Payload Changes

Old: 9 fields (erosion_m, accretion_m, net_change_m, stable_pct, erosion_m2, accretion_m2, period_start, period_end, mapImageUrl)

New: 13 fields (above + algorithm, slr_pct_1m, slr_pct_2m, slr_pct_5m, cmip6_temp_delta_c)

## Key Decisions

1. **scale=10 + min_area_m2=1000 for narrow atolls** — tuvalu, kiribati, marshall-islands use 10m analysis scale to preserve thin coastline features that would be lost at 30m. Min area 1000 m² (0.1 ha) for these regions vs 5000 m² (0.5 ha) for standard.

2. **SRTM scale fixed at 30m for SLR exposure** — regardless of per-region analysis scale. SRTM is a 30m DEM; resampling to 10m adds no information and costs more compute.

3. **CMIP6 model ACCESS-CM2** — Australian climate model with best Pacific SIDS coverage in the NASA GDDP-CMIP6 dataset. SSP585 (worst-case) for policy-relevant conservative risk framing.

4. **Graceful null on CMIP6 failure** — Pitfall 3: narrow atolls whose bbox falls within a single 27.5km CMIP6 grid cell may return null from `reduceRegion`. `compute_cmip6_temp_delta` returns `None` in this case; response field is `null`. UI must handle gracefully (05-02).

5. **selfMask() before connectedPixelCount** — Pitfall 1 guarded by calling `water_b.selfMask()` before passing to `apply_min_area_filter`. Without this, the giant connected land-pixel component (entire land mass at value=0) passes the area filter and invalidates all change detection.

6. **live flags UNCHANGED** — This plan ONLY rewrites the algorithm. 3 regions remain live=True (niue, palau, fiji). The 5 gated regions (tuvalu, kiribati, marshall-islands, vanuatu, solomon-islands) are activated in 05-02 as a clean separate commit.

## Deviations from Plan

None — plan executed exactly as written.

## Known Gap (surfaced to 05-02)

5 SIDS still have `live: False` in `analyse.py`:
- tuvalu (scale=10, min_area=1000)
- kiribati (scale=10, min_area=1000)
- marshall-islands (scale=10, min_area=1000)
- vanuatu (scale=30, min_area=5000)
- solomon-islands (scale=30, min_area=5000)

Plan 05-02 will flip these to `live: True` and wire the new `slr_pct_*` + `cmip6_temp_delta_c` fields into UI cards in CoastlineModule and the Compare view.

## Self-Check: PASSED

| Item | Status |
|---|---|
| `web/lib/coastline-metrics.test.ts` | FOUND |
| `web/lib/coastline-metrics.ts` | FOUND |
| `web/components/modules/coastline/CoastlineModule.test.ts` | FOUND |
| `web/api/analyse.py` | FOUND (rewritten) |
| `web/components/modules/coastline/MetricCards.tsx` | FOUND (extended) |
| `web/components/modules/coastline/CoastlineModule.tsx` | FOUND (updated) |
| `.planning/phases/05-sids-data-activation/05-01-SUMMARY.md` | FOUND |
| Commit `133f921` (Wave 0 tests) | FOUND |
| Commit `425cbae` (MetricCards + CoastlineModule) | FOUND |
| Commit `4078857` (analyse.py rewrite) | FOUND |
| 51/51 vitest tests passing | PASSED |
