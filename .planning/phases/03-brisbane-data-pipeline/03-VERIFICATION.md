---
phase: 03-brisbane-data-pipeline
verified: 2026-05-22T20:45:00Z
status: human_needed
score: 12/12 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/12
  gaps_closed:
    - "GitHub Actions nightly-ingest.yml now has 9 jobs — ingest-pdh-stat, ingest-deltares, ingest-jrc-glofas added"
    - "flood-zones API now calls flood_zones_geojson_in_bbox — geometry returned as GeoJSON, not null WKB"
    - "DB migration confirmed applied by user — treated as RESOLVED"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Trigger workflow_dispatch on nightly-ingest.yml and confirm all 9 jobs succeed"
    expected: "Each job logs OK: {source} -- N records upserted (or WARN) with no Python exception traceback. Failed jobs do not block others."
    why_human: "Cannot execute GitHub Actions from local verification. First run confirms whether BCC field names, WMIP API structure, and IDMC response shapes match script assumptions."
  - test: "IntelligencePanel live data display — select Tuvalu in region tree"
    expected: "Displaced stat shows a real number or No data (not a hardcoded static number). Flood Depth (100yr) follows same pattern. Both transition from Loading... then resolve."
    why_human: "Cannot observe React state transitions or confirm useEffect fires correctly without running the browser."
---

# Phase 3: Brisbane Data Pipeline Verification Report

**Phase Goal:** Deploy the Brisbane data pipeline — PostGIS schema, GitHub Actions ingestion workflows, and Next.js API routes — so IntelligencePanel shows real displacement and flood depth data instead of static placeholders.
**Verified:** 2026-05-22T20:45:00Z
**Status:** human_needed (all automated checks pass)
**Re-verification:** Yes — after gap closure

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PostGIS extension enabled, 4 tables created with GIST indexes and RLS | VERIFIED | `002_postgis_schema.sql`: 4 CREATE TABLE, 3 GIST, 4 RLS ENABLE, flood_zones_in_bbox function |
| 2 | flood_forecasts UNIQUE constraint supports idempotent upserts | VERIFIED | `UNIQUE(source, forecast_date, latitude, longitude)` present in migration |
| 3 | GitHub Actions nightly workflow runs at 04:00 AEST, all 9 jobs are independent | VERIFIED | Cron `0 18 * * *` correct, 9 independent jobs (no needs:) — all 9 scripts wired |
| 4 | BCC flood risk zones wired — source='bcc', region_slug='brisbane' | VERIFIED | `ingest_bcc_flood.py` fetches services2.arcgis.com, upserts with correct on_conflict and region_slug |
| 5 | QLD 2011 Grantham polygons wired — source='qld_2011', region_slug='grantham' | VERIFIED | `ingest_qld_2011.py` filters to Grantham bbox, region_slug="grantham" confirmed |
| 6 | WMIP gauge readings wired — source='wmip' into flood_forecasts | VERIFIED | `ingest_wmip_gauges.py` targets Brisbane River + Lockyer Creek, upserts flood_forecasts |
| 7 | Pacific displacement — IDMC + World Bank + PDH.stat scripts wired into workflow | VERIFIED | All 3 scripts present and wired as jobs in nightly-ingest.yml |
| 8 | PDH.stat population projections wired into nightly pipeline | VERIFIED | `ingest-pdh-stat` job added (lines 99-112 of workflow); script exists and is substantive |
| 9 | Deltares (coastal SIDS) + JRC GloFAS (Brisbane) flood depth wired into workflow | VERIFIED | `ingest-deltares` (lines 114-127) and `ingest-jrc-glofas` (lines 129-143) jobs added; GEE_B64_KEY on jrc_glofas only (Deltares uses Planetary Computer — correct) |
| 10 | /api/flood-zones returns GeoJSON FeatureCollection with real geometry from Supabase | VERIFIED | Route now calls `flood_zones_geojson_in_bbox` RPC (line 27) — returns GeoJSON directly, no geometry: null |
| 11 | /api/displacement, /api/flood-depth, /api/forecasts/open-meteo, /api/countries serve real DB data | VERIFIED | All 4 routes: createSupabaseAdminClient(), real queries, ISR revalidate=3600 |
| 12 | IntelligencePanel fetches real data — displaced_count and flood depth from API | VERIFIED | useEffect fetches /api/displacement and /api/flood-depth on slug change; FALLBACK_SCORES only during loading transient |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `web/supabase/migrations/002_postgis_schema.sql` | PostGIS schema, 4 tables, indexes, RLS, flood_zones_in_bbox | VERIFIED | 133 lines; 4 tables, 3 GIST, 3 UNIQUE, 4 RLS, function present |
| `.github/workflows/nightly-ingest.yml` | 9 independent jobs, cron 0 18 * * * | VERIFIED | 9 jobs confirmed, cron correct, all scripts wired, GEE_B64_KEY on jrc-glofas |
| `scripts/ingest/ingest_bcc_flood.py` | BCC ArcGIS FeatureServer paginated ingestion | VERIFIED | services2.arcgis.com, paginated, on_conflict, region_slug=brisbane |
| `scripts/ingest/ingest_qld_2011.py` | QLD 2011 GPKG download + Grantham filter | VERIFIED | Grantham bbox filter, region_slug=grantham, reprojection |
| `scripts/ingest/ingest_wmip_gauges.py` | WMIP live gauge API ingestion | VERIFIED | water-monitoring.information.qld.gov.au, two gauge targets |
| `scripts/ingest/ingest_idmc.py` | IDMC GIDD API, 10 Pacific countries | VERIFIED | helix-tools-api.idmcdb.org, 10 ISO3 codes, per-country try/except |
| `scripts/ingest/ingest_worldbank.py` | World Bank wbgapi net migration + population | VERIFIED | wbgapi, SM.POP.NETM + SP.POP.TOTL, 2000-2024 |
| `scripts/ingest/ingest_pdh_stat.py` | PDH.stat SDMX population projections | VERIFIED | Script exists, substantive, wired as ingest-pdh-stat job in workflow |
| `scripts/ingest/ingest_deltares.py` | Deltares Planetary Computer coastal depth | VERIFIED | Script uses planetary_computer package, wired as ingest-deltares job (no GEE key — correct) |
| `scripts/ingest/ingest_jrc_glofas.py` | JRC GloFAS v2.1 GEE Brisbane flood depth | VERIFIED | Script wired as ingest-jrc-glofas job with GEE_B64_KEY secret |
| `scripts/ingest/ingest_open_meteo.py` | Open-Meteo Flood API Brisbane discharge | VERIFIED | flood-api.open-meteo.com, wired in workflow as ingest-open-meteo |
| `web/app/api/flood-zones/route.ts` | GeoJSON FeatureCollection via flood_zones_geojson_in_bbox | VERIFIED | Calls supabase.rpc("flood_zones_geojson_in_bbox") and returns data directly — no geometry: null |
| `web/app/api/displacement/route.ts` | displacement_records query: events, total_displaced, trend | VERIFIED | Real query, data_type filter, trend aggregation |
| `web/app/api/flood-depth/route.ts` | analysis_cache (Brisbane) + flood_forecasts (Deltares/SIDS) | VERIFIED | Both paths implemented, region-aware branching |
| `web/app/api/forecasts/open-meteo/route.ts` | flood_forecasts discharge timeseries | VERIFIED | Real query, source=open_meteo filter, ISR |
| `web/app/api/countries/route.ts` | REGION_LIST + displacement summary stats | VERIFIED | REGION_LIST mapped, displacement aggregated per country |
| `web/components/command/IntelligencePanel.tsx` | Wired to real API — no STATIC_SCORES as primary | VERIFIED | useEffect fetches both /api/displacement and /api/flood-depth; FALLBACK_SCORES only for loading transient |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `IntelligencePanel.tsx` | `/api/displacement` | fetch in useEffect on slug change | WIRED | fetch('/api/displacement?country=${countryCode}') |
| `IntelligencePanel.tsx` | `/api/flood-depth` | fetch in useEffect on slug change | WIRED | region-aware URL construction |
| `api/flood-zones/route.ts` | `flood_zones_geojson_in_bbox` | `supabase.rpc('flood_zones_geojson_in_bbox', ...)` | WIRED | Line 27: rpc call with p_minx/p_miny/p_maxx/p_maxy; returns GeoJSON directly |
| `api/flood-depth/route.ts` | `analysis_cache` (Brisbane) | `.from('analysis_cache').eq('region_slug', region)` | WIRED | Complete query chain |
| `api/flood-depth/route.ts` | `flood_forecasts` (Deltares/SIDS) | `.from('flood_forecasts').eq('source', 'deltares')` | WIRED | Query with scenario filter |
| `nightly-ingest.yml` | `ingest_bcc_flood.py` / `ingest_qld_2011.py` / `ingest_wmip_gauges.py` | `python scripts/ingest/...` | WIRED | Lines 19, 34, 49 |
| `nightly-ingest.yml` | `ingest_idmc.py` / `ingest_worldbank.py` / `ingest_open_meteo.py` | `python scripts/ingest/...` | WIRED | Lines 64, 79, 94 |
| `nightly-ingest.yml` | `ingest_pdh_stat.py` | `python scripts/ingest/ingest_pdh_stat.py` | WIRED | Lines 99-112 — gap closed |
| `nightly-ingest.yml` | `ingest_deltares.py` | `python scripts/ingest/ingest_deltares.py` | WIRED | Lines 114-127 — gap closed |
| `nightly-ingest.yml` | `ingest_jrc_glofas.py` | `python scripts/ingest/ingest_jrc_glofas.py` | WIRED | Lines 129-143, GEE_B64_KEY present — gap closed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EARTH-07 | 03-01 | Supabase PostGIS schema — 4 tables, GIST indexes, RLS | SATISFIED | `002_postgis_schema.sql` verified: 4 tables, 3 GIST, 4 RLS, flood_zones_in_bbox + flood_zones_geojson_in_bbox confirmed applied by user |
| EARTH-08 | 03-02 | GitHub Actions nightly ingestion workflow, fail-independently | SATISFIED | All 9 scripts now wired as independent jobs; cron 0 18 * * * correct |
| EARTH-09 | 03-02 | Brisbane flood data — BCC, QLD 2011, WMIP | SATISFIED | All 3 scripts exist, substantive, wired in workflow |
| EARTH-10 | 03-03 | Pacific displacement — IDMC, World Bank, PDH.stat | SATISFIED | All 3 scripts wired; ingest-pdh-stat job added |
| EARTH-11 | 03-04 | Flood depth — Deltares, JRC GloFAS, Open-Meteo | SATISFIED | All 3 scripts wired; ingest-deltares and ingest-jrc-glofas jobs added |
| EARTH-12 | 03-05 | Next.js API routes — 5 endpoints, ISR, IntelligencePanel wired | SATISFIED | All 5 routes present and substantive; flood-zones now returns GeoJSON geometry via flood_zones_geojson_in_bbox RPC |

---

## TypeScript and Test Suite

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| `npm test -- --passWithNoTests --no-coverage` | 4 test files, 26 tests — all passed |

---

## Anti-Patterns Found

No blocker anti-patterns. The previous `geometry: null` hardcode in flood-zones route has been resolved — the route now calls `flood_zones_geojson_in_bbox` and returns the RPC result directly with no null geometry override.

No TODO/FIXME/placeholder comments found across the 5 API route files. IntelligencePanel FALLBACK_SCORES are used only as loading transient — not a stub.

---

## Human Verification Required

### 1. GitHub Actions First Run — All 9 Jobs

**Test:** Go to Actions tab in GitHub repo, find "Nightly Data Ingestion", click "Run workflow" (workflow_dispatch trigger), watch each job's log.
**Expected:** Each of the 9 jobs logs `OK: {source} -- N records upserted` or `WARN: {source} -- ...` with no Python exception traceback. Failed jobs must not block others (no `needs:` dependencies).
**Why human:** Cannot execute GitHub Actions from local verification. First run confirms whether BCC field names, WMIP API structure, IDMC response shapes, Deltares STAC catalog access, and JRC GloFAS GEE asset availability match script assumptions.

### 2. IntelligencePanel Live Data Display

**Test:** Start `npm run dev`, select Tuvalu in the region tree, observe IntelligencePanel stat cells.
**Expected:** "Displaced" shows a real number or "No data" (not hardcoded 87). "Flood Depth (100yr)" follows same pattern. Both transition from "Loading..." then resolve. Selecting Brisbane shows flood depth from JRC GloFAS path (analysis_cache).
**Why human:** Cannot observe React state transitions or confirm useEffect fires correctly without running the browser. Requires at least one completed ingestion run to show real numbers rather than "No data".

---

*Verified: 2026-05-22T20:45:00Z*
*Verifier: Claude (gsd-verifier)*
