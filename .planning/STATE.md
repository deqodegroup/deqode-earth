---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-05-22T10:22:36.634Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 5
  completed_plans: 7
---

# State — DEQODE EARTH

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-22)

**Core value:** Government researcher opens DEQODE EARTH, clicks any Pacific SIDS, gets verified displacement + coastline + flood risk data in 10 seconds.
**Current focus:** Phase 03 — brisbane-data-pipeline COMPLETE (all 5 plans done 2026-05-22)
**Last completed:** 03-05 API routes + IntelligencePanel wiring (2026-05-22)
**Hard deadline:** 2 September 2026 (COPRRRA Symposium, Brisbane)
**Last session:** 2026-05-22T10:20:33Z — Stopped at: Completed 03-05-PLAN.md

## Current Position

Phase: 03 (brisbane-data-pipeline) — COMPLETE
Plan: 5 of 5 (all plans complete)

## Phases Complete

### Phase 1: Command Center Shell ✓ (2026-05-20)

- Syne + Source Sans 3 fonts, OKLCH migration/retreat tokens, panel animation CSS vars
- lib/map-config.ts with ASIA_PACIFIC_DEFAULT + TILE_URLS
- CommandBar (server component, auth, S2 Active satellite dot)
- StatusStrip (32px bottom bar, COPRRRA demo mode badge)
- MapCanvas + MapCanvasClient (full-viewport Leaflet, flyTo API)
- Command Center homepage (3-panel shell)
- Security headers in next.config.ts

### Phase 2: Region Intelligence ✓ (2026-05-21)

- lib/regions.ts — 10 regions: 8 SIDS + Brisbane (urban_flood) + Grantham (managed_retreat)
- RegionTypeBadge — SIDS/FLOOD ZONE/MANAGED RETREAT/CASE STUDY
- RegionTree + RegionTreeClient — grouped by sub-region, URL ?region=slug selection
- RiskScoreHUD — animated count-up with cubic ease, cancelAnimationFrame cleanup
- IntelligencePanel — slides in on region select, static risk scores, module tabs, Compare CTA
- /region/[slug] → redirects to /?region=slug
- /region/[slug]/[module] → CoastlineModule live, others stubbed
- 26 tests passing, TypeScript clean, production build green

### Phase 3: Brisbane Data Pipeline ✓ (2026-05-22) — ALL 5 PLANS COMPLETE

- 03-01: PostGIS schema (4 tables: flood_zones, flood_forecasts, displacement_records, analysis_cache) + flood_zones_in_bbox RPC
- 03-02: Brisbane flood ingestion (BCC FeatureServer, QLD 2011 GPKG, WMIP gauges)
- 03-03: Pacific displacement ingestion (IDMC, World Bank, PDH.stat)
- 03-04: Flood depth ingestion (Deltares, JRC GloFAS, Open-Meteo)
- 03-05: 5 Next.js API routes + IntelligencePanel wired to real displaced_count + flood depth

## Key Technical Decisions

- **Map:** Leaflet (not Mapbox) — free tier, no token required at MVP
- **Fonts:** Syne (headings) + Source Sans 3 (body) — replaces DM Sans
- **Colors:** OKLCH token system — migration tokens (teal) + retreat tokens (amber)
- **Auth:** Supabase (profiles table, RLS enabled, deqode_admin role)
- **GEE:** Service account auth (B64 key in Vercel env), non-commercial TOFI access
- **Data storage:** Supabase PostGIS (Phase 3+) — NOT BigQuery
- **Ingestion:** GitHub Actions nightly (Phase 3+) — NOT Cloud Run
- **API serving:** Next.js API routes — NOT Flask/FastAPI
- **Coastline:** NDWI > 0 currently (known issue — fix to MNDWI + Otsu in Phase 5)
- **Phase 3 spatial queries:** flood_zones_in_bbox as Postgres RPC function for ST_Intersects bbox queries — cleaner than inline SQL in API routes
- **Phase 3 RLS pattern:** service_role write on all 4 PostGIS tables — ingestion scripts use service key, not user auth tokens
- **flood_forecasts upsert:** on_conflict uses (source, forecast_date, latitude, longitude) — location_hash GENERATED column was NOT added to final 002_postgis_schema.sql migration
- **GitHub Actions secrets:** SUPABASE_URL + SUPABASE_SERVICE_KEY must be configured before first nightly run
- **QLD 2011 GPKG URL:** hardcoded resource URL may need updating; documented in ingest_qld_2011.py header
- **API routes pattern:** createSupabaseAdminClient() + ISR revalidate=3600 on all public read routes
- **SLUG_TO_COUNTRY mapping:** IntelligencePanel derives ISO2 from slug (lib/regions.ts has no country_code field)
- **IntelligencePanel score derivation:** displaced > 10k → 85, > 1k → 70, > 100 → 55; depth > 5m → 80, > 3m → 65; FALLBACK_SCORES during loading

## Environment Variables (Vercel)

- `GEE_B64_KEY` — GEE service account key (base64)
- `NEXT_PUBLIC_SUPABASE_URL` — vofpmfxqlflabpdackls.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role (for ingestion scripts)

## Phase 3 Environment Variables Needed

- `GLOFAS_API_KEY` — Copernicus EWDS (free registration at ewds.climate.copernicus.eu)
- `NASA_EARTHDATA_TOKEN` — NASA Earthdata Login (free registration)
- `SUPABASE_SERVICE_KEY` — already have, needed for GitHub Actions ingestion

## What's Live (as of 2026-05-21)

- Full-screen dark Leaflet map centred Asia-Pacific
- CommandBar: "EARTH." logo, Syne tagline, S2 Active dot, auth
- RegionTree (240px left): 4 active sub-regions, risk dots, URL-based selection
- IntelligencePanel (360px right): slides in on click, animated risk score, module tabs
- StatusStrip (32px bottom): satellite status, region count, COPRRRA badge
- /niue → /?region=niue, /region/niue/coastline → CoastlineModule

## Blockers / Risks

- GloFAS API requires free registration at ewds.climate.copernicus.eu — register before Phase 3 starts
- NASA Earthdata Login required for VIIRS NRT flood products — register before Phase 3 starts
- EM-DAT requires free registration at emdat.be — register before Phase 3 starts
- Deltares Planetary Computer — no registration required, verify pystac-client works in GitHub Actions Ubuntu runner
