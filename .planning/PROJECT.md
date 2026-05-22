# DEQODE EARTH

## What This Is

Asia-Pacific Climate Displacement Intelligence — the digital intelligence layer for climate-related relocation and retreat. Connects displacement origins (Pacific SIDS under sea level rise pressure) with destination intelligence (Australian flood zones facing managed retreat). Built for Pacific island governments, Australian local government, researchers, and NGOs.

Strategic position: The intelligence tool that operationalises the South Pacific Climate Mobility Action Plan 2026–2028.

Orgs: DEQODE GROUP (technology) + The Orator Foundation Inc (TOFI, nonprofit — gives Earth Engine research/free access)

## Core Value

A government researcher or policy advisor can open DEQODE EARTH, click any Pacific SIDS country, and see verified displacement data, coastline change, and flood risk that they could not otherwise assemble in a day's work — within 10 seconds.

## Requirements

### Validated

- ✓ Command center shell (full-viewport map + CommandBar + RegionTree + IntelligencePanel) — Phase 1
- ✓ Asia-Pacific Leaflet map centred at 10°N, 145°E, zoom 4 — Phase 1
- ✓ 10 regions: 8 SIDS + Brisbane (urban_flood) + Grantham (managed_retreat) — Phase 2
- ✓ Region selection via URL (?region=slug), IntelligencePanel slides in — Phase 2
- ✓ RiskScoreHUD animated count-up, RegionTypeBadge, module tabs — Phase 2
- ✓ CoastlineModule with GEE Sentinel-2 analysis — Phase 2

### Active

- [ ] Brisbane flood zone data pipeline (BCC FeatureServer + QLD WMIP + DEA WOfS)
- [ ] Pacific displacement data pipeline (IDMC + World Bank + PDH.stat)
- [ ] Flood depth intelligence (Deltares + JRC GloFAS GEE layers)
- [ ] GitHub Actions nightly ingestion + Supabase PostGIS schema
- [ ] Compare View: origin SIDS vs destination Australia side-by-side
- [ ] MNDWI coastline algorithm fix (replace NDWI > 0 with Otsu threshold)
- [ ] IOM DTM displacement flow integration
- [ ] Grantham managed retreat case study (/cases/grantham)
- [ ] COPRRRA 6-minute demo flow polished and tested

### Out of Scope

- Real-time satellite tasking — cost prohibitive at MVP
- SE Asia / Indian Ocean expansion — post-COPRRRA
- User-generated data layers — post-MVP
- Mobile app — web-first until after COPRRRA

## Context

- **GEE service account:** deqode-earth-streamlit@deqode-earth.iam.gserviceaccount.com
- **GEE project:** deqode-earth (non-commercial, Contributor tier, TOFI research access)
- **Supabase:** vofpmfxqlflabpdackls.supabase.co (PostGIS enabled)
- **Frontend:** Next.js on Vercel (deqode-earth.vercel.app)
- **Auth:** Supabase auth (profiles table, RLS enabled)
- **COPRRRA deadline:** 2 September 2026, Brisbane — hard ship target

## Constraints

- **Cost:** $0/month at MVP — exhaust free tiers before any paid APIs
- **GEE:** Non-commercial TOFI research access — must stay within Earth Engine research quota
- **Timeline:** COPRRRA Sep 2 2026 — all demo-path features must ship before then
- **Coastline algorithm:** Current NDWI > 0 produces physically implausible results — must fix to MNDWI + Otsu before COPRRRA (researchers will be in the room)

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Supabase PostGIS for data storage | Already set up, PostGIS > BigQuery for spatial queries, zero cost | ✓ Good |
| GitHub Actions for nightly ingestion | Full Python geospatial stack on Ubuntu runners, 2000 min/month free | ✓ Good |
| Drop BigQuery + Cloud Run | Cloud Run Jobs not free, BigQuery no PostGIS, unnecessary complexity | ✓ Good |
| Next.js API routes as REST API | Eliminates separate Flask server, Supabase auth tokens work natively | ✓ Good |
| Deltares Planetary Computer for Pacific SIDS flood depth | Only source with coastal inundation for small islands + 2050 projections | ✓ Good |
| IDMC GIDD as displacement backbone | Only source with Pacific event-level displacement counts, free JSON API | ✓ Good |

---
*Last updated: 2026-05-22 after Phase 3 research*
