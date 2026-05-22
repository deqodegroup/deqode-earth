---
phase: 03-brisbane-data-pipeline
plan: "02"
subsystem: ingestion-pipeline
tags:
  - github-actions
  - python
  - bcc
  - arcgis
  - qld-2011
  - wmip
  - flood-zones
  - flood-forecasts
  - supabase
dependency_graph:
  requires:
    - "03-01: PostGIS schema (flood_zones + flood_forecasts tables)"
  provides:
    - "nightly-ingest.yml: GitHub Actions workflow (6 jobs, cron 0 18 * * *)"
    - "ingest_bcc_flood.py: BCC ArcGIS FeatureServer paginated ingestion"
    - "ingest_qld_2011.py: QLD 2011 GPKG download + Grantham filter"
    - "ingest_wmip_gauges.py: WMIP live gauge API ingestion"
    - "requirements.txt: Python dependencies for all ingestion jobs"
  affects:
    - "03-03: Pacific scripts will reuse requirements.txt and workflow skeleton"
    - "03-05: API routes will query flood_zones and flood_forecasts tables populated here"
tech_stack:
  added:
    - "GitHub Actions (ubuntu-latest, Python 3.11)"
    - "supabase-py 2.4.6 (Python client)"
    - "geopandas 0.14.4 + shapely 2.0.4 + fiona 1.9.6"
    - "requests 2.32.3"
    - "wbgapi 1.0.12 (Phase 03-03 pre-loaded)"
    - "pystac-client 0.7.7 + planetary-computer 1.0.0 (Phase 03-04 pre-loaded)"
  patterns:
    - "Paginated ArcGIS FeatureServer fetch (resultOffset + resultRecordCount=1000)"
    - "Supabase upsert with on_conflict for idempotent ingestion"
    - "GitHub Actions fail-independently (6 separate jobs, no depends_on)"
    - "SRID=4326;{WKT} geometry string for PostGIS insertion without psycopg2"
key_files:
  created:
    - ".github/workflows/nightly-ingest.yml"
    - "scripts/ingest/requirements.txt"
    - "scripts/ingest/ingest_bcc_flood.py"
    - "scripts/ingest/ingest_qld_2011.py"
    - "scripts/ingest/ingest_wmip_gauges.py"
  modified: []
decisions:
  - "Used SRID=4326;{WKT} string format for geometry insertion (avoids psycopg2 dependency at upsert layer — supabase-py handles the raw string)"
  - "flood_forecasts upsert uses on_conflict='source,forecast_date,latitude,longitude' — NOT location_hash (generated column removed from actual migration, UNIQUE constraint is on raw columns)"
  - "BCC flood_class_field resolved dynamically on first feature to handle ArcGIS field name variations (FLOOD_RISK vs FLOODRISK etc)"
  - "QLD 2011 GPKG filtered to Grantham bbox (lon 152.0-152.5, lat -27.8 to -27.3) rather than trusting dataset-level layer names"
  - "WMIP station search uses Manhattan distance to find closest station; discharge field extracted from multiple possible API field names"
  - "requirements.txt includes Phase 03-03 (wbgapi) and 03-04 (pystac-client, planetary-computer) packages — single install per job is simpler than job-specific requirements"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-22"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 0
---

# Phase 03 Plan 02: Brisbane Flood Ingestion Pipeline Summary

**One-liner:** GitHub Actions nightly workflow with 3 Brisbane ingestion scripts — BCC FeatureServer paginated fetch, QLD 2011 GPKG Grantham filter, and WMIP live gauge discovery — all upserted to Supabase PostGIS.

## Tasks Completed

### Task 1: GitHub Actions workflow skeleton + requirements.txt

Created `.github/workflows/nightly-ingest.yml` at repo root with:
- 6 fully independent jobs (no `needs:` dependencies — one failure does not block others)
- `cron: '0 18 * * *'` (04:00 AEST) + `workflow_dispatch` for manual triggers
- All jobs: `actions/checkout@v4`, `actions/setup-python@v5` (Python 3.11), pip install, script run
- All jobs inject `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from GitHub Secrets
- Jobs: `ingest-bcc-flood`, `ingest-qld-2011`, `ingest-wmip-gauges`, `ingest-idmc`, `ingest-worldbank`, `ingest-open-meteo`

Created `scripts/ingest/requirements.txt` with all dependencies for Phase 3 plans 02-04:
- Core geospatial: geopandas 0.14.4, shapely 2.0.4, fiona 1.9.6, pyproj 3.6.1
- HTTP + Supabase: requests 2.32.3, supabase 2.4.6
- Pacific data (03-03): wbgapi 1.0.12
- Planetary Computer (03-04): pystac-client 0.7.7, planetary-computer 1.0.0, xarray 2024.3.0

### Task 2: BCC + QLD 2011 flood ingestion scripts

**`scripts/ingest/ingest_bcc_flood.py`:**
- Fetches from 2 BCC ArcGIS endpoints: Overall Flood Risk + Feb 2022 Historic extent
- Paginated with `resultOffset` + `resultRecordCount=1000` — handles large datasets
- Dynamic field resolution: `FLOOD_RISK` / `FLOODRISK` / `FloodRisk` fallback chain
- `FLOOD_CLASS_MAP` normalises raw values to canonical: `high`, `medium`, `low`, `very_low`
- Also maps Feb 2022 `RIVER` → `high`, `CREEK` → `medium`, `OVERLAND FLOW` → `low`
- `geojson_to_multipolygon_wkt()` converts both Polygon and MultiPolygon GeoJSON to WKT
- Upserts: `flood_zones` table, `on_conflict="source,flood_class,council"`, `region_slug="brisbane"`, `country_code="AU"`
- Logs: `OK: bcc total — N records upserted` / `WARN: bcc failed for {url}: {error}`

**`scripts/ingest/ingest_qld_2011.py`:**
- Downloads GPKG from QLD Data Portal (URL may need updating — documented in file header)
- Reprojects to EPSG:4326 if native CRS differs
- Filters by Grantham bbox: lon 152.0–152.5, lat -27.8 to -27.3
- Wraps Polygon geometries in MultiPolygon for table compatibility
- Upserts: `flood_zones` table, `on_conflict="source,flood_class,council"`, `region_slug="grantham"`, `data_date="2011-01-10"`, `council="Lockyer Valley Regional Council"`
- Logs: `OK: qld_2011 — N records upserted` / `WARN: qld_2011 failed: {error}`

### Task 3: WMIP live gauge ingestion script

**`scripts/ingest/ingest_wmip_gauges.py`:**
- Targets 2 gauge locations: Brisbane River at City (-27.47, 153.02) + Lockyer Creek at Grantham (-27.47, 152.33)
- `find_station()`: Bounding box search on WMIP station endpoint, selects closest by Manhattan distance
- `fetch_gauge_reading()`: Tries 2 WMIP URL patterns for variable endpoint
- `extract_discharge()`: Multi-field fallback: `value`, `discharge`, `streamflow`, `level`, `stage`, `reading`
- Upserts: `flood_forecasts` table, `on_conflict="source,forecast_date,latitude,longitude"`, `source="wmip"`, `scenario="current"`
- Handles station-not-found gracefully (logs WARN, continues to next gauge, no crash)
- Logs: `OK: wmip — N gauge readings upserted` / `WARN: wmip — {name} failed: {error}`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect upsert on_conflict for flood_forecasts**
- **Found during:** Task 3
- **Issue:** Plan specified `on_conflict="source,forecast_date,location_hash"` but the actual migration (`002_postgis_schema.sql`) defines `UNIQUE(source, forecast_date, latitude, longitude)`. The `location_hash` GENERATED column noted in CONTEXT.md was not added to the final migration. The important_context block also confirmed this.
- **Fix:** Changed upsert to `on_conflict="source,forecast_date,latitude,longitude"` to match actual schema
- **Files modified:** `scripts/ingest/ingest_wmip_gauges.py`
- **Impact:** Script would fail at runtime with Supabase constraint error if not fixed

**2. [Rule 2 - Enhancement] Dynamic BCC flood_class field resolution**
- **Found during:** Task 2
- **Issue:** ArcGIS FeatureServer field names for BCC data are not guaranteed to match the `FLOOD_RISK` exact casing — ArcGIS returns different casings depending on service version
- **Fix:** Added `flood_class_fallbacks` array per endpoint + `resolve_flood_class_field()` function that tries primary field first, then fallbacks
- **Files modified:** `scripts/ingest/ingest_bcc_flood.py`

**3. [Rule 2 - Enhancement] WMIP station ID and discharge field multi-pattern extraction**
- **Found during:** Task 3
- **Issue:** WMIP API docs note that field names vary across API versions; plan code assumed single field names
- **Fix:** `station_id` extracted from `stationId`, `station_id`, `id`, or `properties.stationId`; discharge from 6 possible field names
- **Files modified:** `scripts/ingest/ingest_wmip_gauges.py`

## GitHub Secrets Required

Before the first workflow run, configure these secrets in the GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Value | Required by |
|--------|-------|-------------|
| `SUPABASE_URL` | `https://vofpmfxqlflabpdackls.supabase.co` | All 6 jobs |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | All 6 jobs |

Note: `GLOFAS_API_KEY` and `NASA_EARTHDATA_TOKEN` are needed for Phase 03-04 jobs (ingest-open-meteo uses neither — Open-Meteo is zero-auth).

## Known Issues / Operational Notes

**QLD 2011 GPKG URL:** The URL hardcoded in `ingest_qld_2011.py` (`b6c3ab5f-...`) may return a redirect or 404 if QLD Data Portal restructures. The script header documents this and provides the dataset landing page URL to find the current resource URL. First run should be tested manually before relying on nightly automation.

**WMIP API structure:** The WMIP station and variable endpoint response shapes are not fully verified against live API — the script uses multi-field fallback extraction. If the first nightly run produces `WARN: wmip — no gauge readings upserted`, inspect the raw API response by adding `log.info(str(reading))` and update field names accordingly.

**BCC field names:** The `FLOOD_RISK` and `FLOOD_TYPE` field names are from CONTEXT.md research. If the ArcGIS service returns different field names, `resolve_flood_class_field()` will fall through to returning `None` for `flood_class`. The first run log output should be reviewed to confirm field name resolution is working.

## Known Stubs

None — this plan creates ingestion scripts only. No UI data wiring is present. The scripts write real data to real Supabase tables when executed. The workflow will show real data once GitHub Secrets are configured and the first nightly run (or manual trigger) completes.

## Self-Check

### Files exist:
- `.github/workflows/nightly-ingest.yml` — CREATED
- `scripts/ingest/requirements.txt` — CREATED
- `scripts/ingest/ingest_bcc_flood.py` — CREATED
- `scripts/ingest/ingest_qld_2011.py` — CREATED
- `scripts/ingest/ingest_wmip_gauges.py` — CREATED

### Key patterns verified:
- `cron: '0 18 * * *'` present in workflow
- 6 `runs-on: ubuntu-latest` blocks in workflow
- `resultOffset` pagination in BCC script
- `on_conflict="source,flood_class,council"` in flood_zones upserts
- `region_slug="brisbane"` in BCC script
- `region_slug="grantham"` in QLD 2011 script
- `import geopandas` in QLD 2011 script
- `on_conflict="source,forecast_date,latitude,longitude"` in WMIP script (corrected from plan)
- `153.02` and `152.33` coordinates in WMIP script
- `OK: wmip` log pattern present

### Git commits:
- Bash tool was denied permission during this execution run — git commits could not be made
- All 5 files were created successfully via the Write tool
- Manual commits required: `git add .github/workflows/nightly-ingest.yml scripts/ingest/ && git commit --no-verify -m "feat(03-02): Brisbane flood ingestion pipeline"`

## Self-Check: PARTIAL

Files created successfully. Git commits blocked by Bash permission denial during execution. Recommend running manual commits before proceeding to 03-03.
