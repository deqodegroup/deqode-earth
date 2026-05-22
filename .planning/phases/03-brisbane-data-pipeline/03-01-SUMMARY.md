---
phase: 03-brisbane-data-pipeline
plan: 01
subsystem: database
tags: [postgis, supabase, sql, spatial, migration, rls]

# Dependency graph
requires:
  - phase: 01-command-center
    provides: security headers and project scaffold
  - phase: 02-region-intelligence
    provides: lib/regions.ts with region slugs and country codes

provides:
  - PostGIS extension enabled in Supabase
  - flood_zones table with MultiPolygon geometry, GIST index, region_slug, RLS
  - flood_forecasts table with Point geometry, generated location_hash, GIST index, RLS
  - displacement_records table with Point geometry, country_code+year composite index, GIST, RLS
  - analysis_cache table with UNIQUE(region_slug, analysis_type, params_hash), RLS
  - flood_zones_in_bbox(p_minx, p_miny, p_maxx, p_maxy) PostGIS function
  - Migration file at web/supabase/migrations/002_postgis_schema.sql

affects:
  - 03-02 (Brisbane flood zone ingestion — upserts into flood_zones)
  - 03-03 (Pacific displacement ingestion — upserts into displacement_records)
  - 03-04 (Flood depth ingestion — upserts into flood_forecasts + analysis_cache)
  - 03-05 (API routes — all 4 tables + flood_zones_in_bbox function)

# Tech tracking
tech-stack:
  added: [PostGIS, pgcrypto sha256 (PostgreSQL 15+ built-in)]
  patterns:
    - IF NOT EXISTS for all DDL (idempotent migration)
    - GIST indexes on all geometry columns
    - RLS with public read + service_role write
    - GENERATED ALWAYS AS STORED for computed deduplication keys
    - UNIQUE constraints for upsert idempotency

key-files:
  created:
    - web/supabase/migrations/002_postgis_schema.sql

key-decisions:
  - "UNIQUE(source, forecast_date, location_hash) on flood_forecasts enables idempotent upserts from nightly ingestion"
  - "flood_zones_in_bbox as a Postgres RPC function — cleaner than inline ST_Intersects in API route"
  - "service_role write policy on all tables — ingestion scripts use service key, not user auth"
  - "displacement_records has no UNIQUE constraint — plan spec inconsistency (CONTEXT.md locked schema has none, plan verify comment erroneously expected 4); locked schema wins"

patterns-established:
  - "Migration style: IF NOT EXISTS DDL, no transaction wrappers, RLS immediately after CREATE TABLE"
  - "Spatial index naming: {table}_geom_idx for GIST, {table}_region_idx for region_slug btree"

requirements-completed: [EARTH-07]

# Metrics
duration: 2min
completed: 2026-05-22
---

# Phase 3 Plan 01: PostGIS Schema Migration Summary

**Supabase PostGIS schema with 4 spatial tables (flood_zones, flood_forecasts, displacement_records, analysis_cache), 3 GIST indexes, 3 UNIQUE constraints, full RLS, and flood_zones_in_bbox bbox query function**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-22T09:25:42Z
- **Completed:** 2026-05-22T09:28:04Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created `web/supabase/migrations/002_postgis_schema.sql` — 135-line migration that is the dependency root for all Phase 3 plans
- All 4 tables schema-locked per 03-CONTEXT.md: flood_zones, flood_forecasts, displacement_records, analysis_cache
- flood_zones_in_bbox PostGIS function enables bbox spatial queries via `supabase.rpc()` in the API route
- Generated `location_hash` column in flood_forecasts uses sha256 for idempotent upsert deduplication

## Task Commits

1. **Task 1: Write PostGIS migration SQL** - `6e8cd1e` (feat)

**Plan metadata:** (pending — see below)

## Files Created/Modified

- `web/supabase/migrations/002_postgis_schema.sql` — Full PostGIS schema: CREATE EXTENSION postgis + 4 tables + 3 GIST indexes + 3 UNIQUE constraints + 4 RLS enable + 8 RLS policies + flood_zones_in_bbox function

## Decisions Made

- Schema follows locked spec in 03-CONTEXT.md exactly — no alterations to table/column names
- `IF NOT EXISTS` on all CREATE statements makes migration idempotent (safe to re-run)
- RLS: public read (`USING (true)`), service_role write on all 4 tables — matches ingestion pattern
- `flood_zones_in_bbox` declared as `LANGUAGE sql STABLE` (no side effects, can be optimised by planner)

## Deviations from Plan

### Plan Spec Inconsistency (noted, not fixed)

**Plan acceptance criteria stated `grep -c "UNIQUE" ...` expected = 4 (one per table).**

The locked schema in 03-CONTEXT.md has no UNIQUE constraint on `displacement_records`. The plan's SQL block also has no UNIQUE on that table. The verify comment's expected value of 4 is incorrect — the correct count is 3 (flood_zones, flood_forecasts, analysis_cache). The locked CONTEXT.md schema wins; the file has 3 UNIQUE constraints as specified.

All other acceptance criteria pass:
- `grep -c "CREATE TABLE"` = 4
- `grep "CREATE EXTENSION IF NOT EXISTS postgis"` = match
- `grep "CREATE OR REPLACE FUNCTION flood_zones_in_bbox"` = match
- `grep -c "USING GIST"` = 3 (flood_zones, flood_forecasts, displacement_records)
- `grep "location_hash"` = match
- `grep -c "ENABLE ROW LEVEL SECURITY"` = 4
- `grep "region_slug"` = matches in flood_zones AND analysis_cache

## Issues Encountered

**Supabase CLI not linked** — `npx supabase db push` failed: "Cannot find project ref. Have you run supabase link?" The Supabase CLI requires `supabase login` (access token) to link and push. No access token was in the environment.

**Action required: Apply the migration manually.**

Go to: https://supabase.com/dashboard/project/vofpmfxqlflabpdackls/sql/new

Copy and paste the full contents of `web/supabase/migrations/002_postgis_schema.sql` and click "Run".

The migration is idempotent (`IF NOT EXISTS`) — safe to run even if some tables already exist.

## User Setup Required

**Manual database migration required.**

1. Open: https://supabase.com/dashboard/project/vofpmfxqlflabpdackls/sql/new
2. Paste the full SQL from `web/supabase/migrations/002_postgis_schema.sql`
3. Click "Run"
4. Verify by checking Tables in the Supabase dashboard — you should see: flood_zones, flood_forecasts, displacement_records, analysis_cache

Once applied, all Phase 3 ingestion scripts (Plans 02-04) can run.

## flood_zones_in_bbox Function Signature

```sql
CREATE OR REPLACE FUNCTION flood_zones_in_bbox(
  p_minx numeric,  -- west longitude
  p_miny numeric,  -- south latitude
  p_maxx numeric,  -- east longitude
  p_maxy numeric   -- north latitude
)
RETURNS SETOF flood_zones
LANGUAGE sql STABLE
```

Called via: `supabase.rpc('flood_zones_in_bbox', { p_minx, p_miny, p_maxx, p_maxy })`

## Next Phase Readiness

- Schema is committed and ready for immediate manual application to Supabase
- Once applied, Plans 02 (BCC ingestion), 03 (displacement), 04 (flood depth), and 05 (API routes) can all proceed
- No blockers beyond the manual SQL execution step above
- All region_slugs and country_codes in the schema match lib/regions.ts exactly

---
*Phase: 03-brisbane-data-pipeline*
*Completed: 2026-05-22*
