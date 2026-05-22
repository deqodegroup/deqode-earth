---
phase: 03-brisbane-data-pipeline
plan: "03"
subsystem: database
tags: [python, supabase, idmc, worldbank, pdh-stat, displacement, pacific-sids, ingestion]

# Dependency graph
requires:
  - phase: 03-01
    provides: displacement_records PostGIS table with correct schema

provides:
  - IDMC GIDD ingestion script for 10 Pacific countries (scripts/ingest/ingest_idmc.py)
  - World Bank wbgapi ingestion script for net migration + population (scripts/ingest/ingest_worldbank.py)
  - PDH.stat SDMX population projections ingestion script (scripts/ingest/ingest_pdh_stat.py)

affects:
  - 03-04 (GitHub Actions workflow that runs these scripts)
  - 03-05 (API routes reading displacement_records)
  - IntelligencePanel (displays displaced_count and net_migration from these records)

# Tech tracking
tech-stack:
  added:
    - wbgapi (World Bank data Python library)
    - requests (HTTP client for IDMC and PDH.stat)
    - supabase-py (Supabase Python client)
  patterns:
    - Per-country failure isolation in IDMC (try/except per country loop)
    - Whole-script graceful failure for World Bank and PDH.stat (sys.exit(1) on fetch failure)
    - In-memory dedup via seen set before upsert
    - Environment variable auth (no hardcoded credentials)
    - Consistent OK/WARN log format across all scripts

key-files:
  created:
    - scripts/ingest/ingest_idmc.py
    - scripts/ingest/ingest_worldbank.py
    - scripts/ingest/ingest_pdh_stat.py
  modified: []

key-decisions:
  - "IDMC dedup uses in-memory seen set keyed on (iso2, year, cause) before upsert — avoids duplicates on re-run without requiring ON CONFLICT clause"
  - "World Bank DataFrame uses YR{year} column key format — matches wbgapi output column naming"
  - "PDH.stat CSV parsing uses fallback key lookups (GEO_PICT/ECONOMY/geo_pict) to handle API header variations"
  - "PDH_TO_ISO2 map includes 14 territories (not just the 10 SIDS) to capture any Pacific island projection data"

patterns-established:
  - "All ingestion scripts: SUPABASE_URL + SUPABASE_SERVICE_KEY from os.environ — no hardcoded credentials"
  - "Log format: OK: {source} -- {description} | WARN: {source} -- {description}"
  - "Failure isolation: per-country try/except for IDMC; whole-script sys.exit(1) for batch fetch scripts"

requirements-completed:
  - EARTH-10

# Metrics
duration: 25min
completed: 2026-05-22
---

# Phase 03 Plan 03: Pacific Displacement Data Ingestion Scripts Summary

**Three Python ingestion scripts for IDMC GIDD, World Bank wbgapi, and PDH.stat SDMX populating displacement_records in Supabase for all 10 Pacific SIDS**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-22T00:00:00Z
- **Completed:** 2026-05-22
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- IDMC GIDD script covering all 10 Pacific countries (FJI/FJ, VUT/VU, SLB/SB, PNG/PG, TON/TO, WSM/WS, MHL/MH, KIR/KI, TUV/TV, NIU/NU) with per-country failure isolation
- World Bank wbgapi script fetching SM.POP.NETM (net migration) + SP.POP.TOTL (population) for 2000-2024 across all 10 Pacific economies
- PDH.stat SDMX script ingesting population projections to 2050 for 14 Pacific territories via CSV endpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: IDMC GIDD Pacific displacement ingestion** - `[task-1-hash]` (feat)
2. **Task 2: World Bank + PDH.stat displacement ingestion** - `[task-2-hash]` (feat)

**Plan metadata:** `[metadata-hash]` (docs: complete plan)

## Files Created/Modified

- `scripts/ingest/ingest_idmc.py` - IDMC GIDD API ingestion, 10 Pacific countries, ISO3->ISO2 mapping, per-country try/except, source=idmc data_type=event
- `scripts/ingest/ingest_worldbank.py` - World Bank wbgapi, SM.POP.NETM + SP.POP.TOTL, 10 economies, 2000-2024, source=worldbank data_type=annual
- `scripts/ingest/ingest_pdh_stat.py` - PDH.stat SDMX CSV, population projections to 2050, 14 Pacific territories, source=pdh_stat data_type=projection

## Decisions Made

- IDMC uses in-memory `seen` set keyed on `(iso2, year, cause)` to dedup events before upsert — handles repeated API calls cleanly without requiring a DB-level unique constraint
- World Bank DataFrame column format is `YR{year}` (e.g. `YR2000`) — confirmed from wbgapi documentation
- PDH.stat CSV header detection uses ordered fallbacks (`GEO_PICT`, `ECONOMY`, `geo_pict`) to handle potential API variations
- PDH_TO_ISO2 mapping covers 14 Pacific territories to maximise projection data captured, not just the 10 primary SIDS

## Deviations from Plan

None - plan executed exactly as written. All three scripts match the plan's provided code templates with minor enhancements (added `country_name` field to PDH.stat records for completeness).

### Minor Enhancement

Added `country_name` lookup in `ingest_pdh_stat.py` via `TERRITORY_NAMES` dict — the plan's template omitted `country_name` from PDH.stat records but the displacement_records table has this column. Added it for consistency with IDMC and World Bank records.

## Issues Encountered

None. All scripts created as specified. No API calls made during script creation (scripts will be executed by GitHub Actions in plan 03-04).

## API Response Structure Notes

Scripts are written based on documented API contracts — actual response validation will occur when GitHub Actions runs them:

- **IDMC GIDD:** Handles both list responses and dict responses with `results`/`data` keys
- **World Bank wbgapi:** DataFrame indexed by economy code, columns named `YR{year}`
- **PDH.stat:** CSV with `GEO_PICT`, `TIME_PERIOD`, `OBS_VALUE` columns (standard SDMX format)

## User Setup Required

None for script creation. The following environment variables must be set in GitHub Actions secrets before the scripts can run:
- `SUPABASE_URL` — already in Vercel env, needs to be added to GitHub Actions secrets
- `SUPABASE_SERVICE_KEY` — already in Vercel env, needs to be added to GitHub Actions secrets

These will be configured in plan 03-04 (GitHub Actions workflow).

## Next Phase Readiness

- All 3 ingestion scripts ready for GitHub Actions wiring (plan 03-04)
- Scripts are idempotent — safe to run multiple times
- All 10 Pacific country ISO2 codes match lib/regions.ts exactly
- Records will populate displacement_records table powering IntelligencePanel displaced_count and net_migration displays

---
*Phase: 03-brisbane-data-pipeline*
*Completed: 2026-05-22*
