# Roadmap: DEQODE EARTH

## Overview

DEQODE EARTH ships as a live intelligence platform for the COPRRRA Symposium (2 Sep 2026, Brisbane). Seven phases take it from the command center shell through live data pipelines, compare view, algorithm fixes, nightly automation, and the Grantham case study — culminating in a polished 6-minute demo for climate policy researchers and government.

## Phases

- [x] **Phase 1: Command Center Shell** — Full-viewport map, CommandBar, StatusStrip, security headers, OKLCH token system
- [x] **Phase 2: Region Intelligence** — RegionTree, IntelligencePanel, RiskScoreHUD, CoastlineModule, 10 regions
- [x] **Phase 3: Brisbane & Pacific Data Pipeline** — Supabase PostGIS schema, GitHub Actions ingestion, Brisbane flood data, Pacific displacement data, flood depth intelligence, Next.js API routes (completed 2026-05-22)
- [x] **Phase 4: Compare View** — /compare/[origin]/[dest] side-by-side SIDS vs Australia, COPRRRA centrepiece (completed 2026-05-23)
- [ ] **Phase 5: SIDS Data Activation** — MNDWI coastline algorithm fix, live data for all 8 SIDS, SLR thresholds, climate projections
- [ ] **Phase 6: Nightly Agent Pipeline** — Automated GEE analysis, IOM DTM displacement flows, data freshness
- [ ] **Phase 7: Grantham & COPRRRA Polish** — /cases/grantham, demo flow tested, performance optimised

## Phase Details

### Phase 1: Command Center Shell
**Goal**: Replace legacy hero/grid with full-screen intelligence interface
**Depends on**: Nothing
**Requirements**: EARTH-01, EARTH-02, EARTH-03
**Success Criteria**:
  1. Full-viewport Leaflet map loads at Asia-Pacific default (10°N, 145°E, zoom 4)
  2. CommandBar (48px top), StatusStrip (32px bottom), 3-panel shell renders
  3. Syne + Source Sans 3 fonts, OKLCH token system applied
  4. Security headers present in next.config.ts
**Plans**: 4 plans (complete)

Plans:
- [x] 01-01: Font system + OKLCH tokens + map config
- [x] 01-02: CommandBar + StatusStrip components
- [x] 01-03: MapCanvas + MapCanvasClient (Leaflet)
- [x] 01-04: Command center homepage shell

### Phase 2: Region Intelligence
**Goal**: Make regions selectable with live intelligence panel
**Depends on**: Phase 1
**Requirements**: EARTH-04, EARTH-05, EARTH-06
**Success Criteria**:
  1. RegionTree shows 10 regions grouped by sub-region with risk dots
  2. Clicking a region updates URL (?region=slug) and slides in IntelligencePanel
  3. RiskScoreHUD animates count-up with cubic ease
  4. /region/[slug]/coastline shows CoastlineModule with GEE analysis
  5. 26 tests passing, TypeScript clean, production build green
**Plans**: 4 plans (complete)

Plans:
- [x] 02-01: Region data model + lib/regions.ts
- [x] 02-02: RegionTree + RegionTreeClient + URL selection
- [x] 02-03: IntelligencePanel + RiskScoreHUD + RegionTypeBadge
- [x] 02-04: CoastlineModule + /region/[slug]/[module] routing

### Phase 3: Brisbane & Pacific Data Pipeline
**Goal**: Real data flows into the intelligence panel — Brisbane flood zones, Pacific displacement counts, flood depth maps
**Depends on**: Phase 2
**Requirements**: EARTH-07, EARTH-08, EARTH-09, EARTH-10, EARTH-11, EARTH-12
**Success Criteria**:
  1. Supabase PostGIS schema deployed with flood_zones, flood_forecasts, displacement_records, analysis_cache tables
  2. GitHub Actions nightly ingestion runs successfully for all 4 data sources
  3. Brisbane flood risk zones visible on map from BCC FeatureServer
  4. IDMC displacement counts load in IntelligencePanel for Pacific SIDS
  5. World Bank migration trend data populates trend charts
  6. Deltares coastal inundation depth available for Pacific SIDS
  7. All API routes return data with correct GeoJSON structure
**Plans**: 5 plans

Plans:
- [x] 03-01-PLAN.md — Supabase PostGIS schema + migration (4 tables, GIST indexes, RLS)
- [x] 03-02-PLAN.md — Brisbane flood ingestion (BCC FeatureServer + QLD 2011 GPKG + WMIP gauges)
- [x] 03-03-PLAN.md — Pacific displacement ingestion (IDMC GIDD + World Bank wbgapi + PDH.stat SDMX)
- [x] 03-04-PLAN.md — Flood depth intelligence (Deltares Planetary Computer + JRC GloFAS GEE + Open-Meteo)
- [x] 03-05-PLAN.md — Next.js API routes + IntelligencePanel data wiring

### Phase 4: Compare View
**Goal**: Side-by-side comparison of SIDS origin vs Australian destination — COPRRRA centrepiece
**Depends on**: Phase 3
**Requirements**: EARTH-13
**Success Criteria**:
  1. /compare/[origin]/[dest] route renders two-panel layout
  2. Left panel shows SIDS displacement + coastline data; right panel shows Australian flood risk
  3. IOM DTM displacement count visible in comparison header
  4. "Compare" CTA in IntelligencePanel navigates to compare view
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Compare route + layout shell (Wave 0 tests, page, header, divider, mini-map skeleton)
- [x] 04-02-PLAN.md — Data wiring + 6 data modules (displacement, trend, coastline, flood risk, flood depth, flood zone)

### Phase 5: SIDS Data Activation
**Goal**: All 8 Pacific SIDS have live coastline data with correct algorithm
**Depends on**: Phase 3
**Requirements**: EARTH-14, EARTH-15
**Success Criteria**:
  1. MNDWI + Otsu algorithm replaces NDWI > 0 for all coastline analysis
  2. Dry-season composites (May-Oct) used; connected-components 0.5ha min applied
  3. All 8 SIDS show coastline change rate in CoastlineModule
  4. SLR exposure thresholds visible per region
**Plans**: TBD

Plans:
- [x] 05-01: MNDWI coastline algorithm fix
- [ ] 05-02: SIDS data activation + SLR thresholds

### Phase 6: Nightly Agent Pipeline
**Goal**: Platform self-refreshes data nightly; displacement flows visualised
**Depends on**: Phase 5
**Requirements**: EARTH-16, EARTH-17
**Success Criteria**:
  1. Nightly GitHub Actions workflow runs and upserts fresh data to Supabase
  2. Data freshness timestamp visible in StatusStrip
  3. /displacement route shows IOM DTM Pacific flow map
**Plans**: TBD

Plans:
- [ ] 06-01: Nightly agent pipeline + freshness tracking
- [ ] 06-02: Displacement flow map + /displacement route

### Phase 7: Grantham & COPRRRA Polish
**Goal**: Full 6-minute COPRRRA demo flow works flawlessly
**Depends on**: Phase 6
**Requirements**: EARTH-18, EARTH-19
**Success Criteria**:
  1. /cases/grantham loads with QRA buy-back statistics and 2011 flood overlay
  2. Full demo flow (open → Tuvalu → Brisbane → Compare → Grantham) completes in < 6 minutes
  3. All panels responsive, no layout breaks at 1280px+
  4. COPRRRA demo mode badge active in StatusStrip
**Plans**: TBD

Plans:
- [ ] 07-01: Grantham case study page
- [ ] 07-02: Demo flow polish + performance

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 1. Command Center Shell | 4/4 | Complete | 2026-05-20 |
| 2. Region Intelligence | 4/4 | Complete | 2026-05-21 |
| 3. Brisbane & Pacific Data Pipeline | 5/5 | Complete   | 2026-05-22 |
| 4. Compare View | 2/2 | Complete   | 2026-05-23 |
| 5. SIDS Data Activation | 0/2 | Not started | - |
| 6. Nightly Agent Pipeline | 0/2 | Not started | - |
| 7. Grantham & COPRRRA Polish | 0/2 | Not started | - |
