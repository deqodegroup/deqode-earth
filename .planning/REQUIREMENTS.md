# Requirements — DEQODE EARTH

## Requirement IDs

### EARTH-01: Command Center Shell
Full-viewport map with CommandBar, RegionTree, IntelligencePanel, StatusStrip. Dark theme. Syne + Source Sans 3 fonts.
**Status:** ✓ Validated (Phase 1)
**Phase:** 1

### EARTH-02: Asia-Pacific Map Configuration
Leaflet map centred at 10°N, 145°E, zoom 4. OKLCH migration/retreat token system. flyTo API.
**Status:** ✓ Validated (Phase 1)
**Phase:** 1

### EARTH-03: Security Headers
Security headers in next.config.ts. Auth guard on protected routes.
**Status:** ✓ Validated (Phase 1)
**Phase:** 1

### EARTH-04: Region Data Model
10 regions: 8 Pacific SIDS + Brisbane (urban_flood) + Grantham (managed_retreat). Regional type badges. URL-based selection.
**Status:** ✓ Validated (Phase 2)
**Phase:** 2

### EARTH-05: Intelligence Panel
IntelligencePanel with animated RiskScoreHUD, module tabs, Compare CTA. Slides in on region select.
**Status:** ✓ Validated (Phase 2)
**Phase:** 2

### EARTH-06: Coastline Module
CoastlineModule with live GEE Sentinel-2 analysis. /region/[slug]/[module] routing.
**Status:** ✓ Validated (Phase 2)
**Phase:** 2

### EARTH-07: Supabase PostGIS Schema
flood_zones, flood_forecasts, displacement_records, analysis_cache tables with PostGIS geometry columns and GIST indexes.
**Status:** ✓ Validated (Phase 3, Plan 01 — 2026-05-22)
**Phase:** 3

### EARTH-08: GitHub Actions Ingestion Pipeline
Nightly ingestion workflow (.github/workflows/nightly-ingest.yml). Python scripts for each data source. Fail-independently pattern.
**Status:** ✓ Validated (Phase 3, Plan 02 — 2026-05-22)
**Phase:** 3

### EARTH-09: Brisbane Flood Data
BCC Flood Awareness FeatureServer (property-level risk + 2011/2022 extents). QLD Flood Extent 2011 GPKG (Grantham polygon). QLD WMIP live gauge API (Lockyer Creek + Brisbane River).
**Status:** ✓ Validated (Phase 3, Plan 02 — 2026-05-22)
**Phase:** 3

### EARTH-10: Pacific Displacement Data
IDMC GIDD API (event displacement counts for Fiji, Vanuatu, Solomon Islands, PNG, Tonga). World Bank wbgapi (net migration 1960-present). PDH.stat SDMX (population baselines, all 22 territories).
**Status:** Active
**Phase:** 3

### EARTH-11: Flood Depth Intelligence
Deltares Planetary Computer (coastal inundation depth + 2050 projections for Pacific SIDS). JRC GloFAS v2.1 GEE (90m flood depth 10/50/100/500yr return periods for Brisbane). Open-Meteo Flood API (live Brisbane river discharge forecasts).
**Status:** Active
**Phase:** 3

### EARTH-12: Next.js Data API Routes
/api/flood-zones, /api/forecasts/glofas, /api/displacement, /api/analysis/coastline-change, /api/analysis/trigger, /api/countries endpoints. ISR caching. Auth-protected mutations.
**Status:** Active
**Phase:** 3

### EARTH-13: Compare View
/compare/[origin]/[dest] — side-by-side SIDS origin vs Australian destination. IOM DTM displacement count overlay. COPRRRA centrepiece demo.
**Status:** Active
**Phase:** 4

### EARTH-14: MNDWI Coastline Algorithm Fix
Replace NDWI > 0 with MNDWI + Otsu threshold + dry-season composites (May-Oct) + connected-components (0.5ha min). Match DEA Coastlines / CoastSat methodology.
**Status:** Active
**Phase:** 5

### EARTH-15: SIDS Data Activation
Live coastline data for all 8 Pacific SIDS regions. SLR exposure thresholds via GEE SRTM. NASA NEX-GDDP-CMIP6 climate projections SSP585.
**Status:** ✓ Validated (Phase 5 — 05-02)
**Phase:** 5

### EARTH-16: Nightly Agent Pipeline
Cloud Run Jobs or GitHub Actions scheduled GEE analysis. Automated coastline change detection nightly. Data freshness indicators in UI.
**Status:** Active
**Phase:** 6

### EARTH-17: IOM DTM Displacement Flows
/displacement route with IOM DTM flow map. Pacific displacement flow arrows from SIDS to Australia.
**Status:** Active
**Phase:** 6

### EARTH-18: Grantham Case Study
/cases/grantham — managed retreat case study. QRA buy-back statistics. 2011 flood polygon overlay. Field trip context for COPRRRA Day 2.
**Status:** Active
**Phase:** 7

### EARTH-19: COPRRRA Demo Polish
6-minute demo flow tested end-to-end. Performance optimised. All panels responsive. COPRRRA demo mode badge active.
**Status:** Active
**Phase:** 7
