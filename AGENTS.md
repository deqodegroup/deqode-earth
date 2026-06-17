# DEQODE Earth - Agent Instructions

## Read First
Every agent working in this repo must read this file before touching code, config, docs, deployments, tests, or data.

This project sits under the global `C:\Dev` rules. Those global rules still apply here: plain English, scoped edits, security-first data handling, and project memory updates after meaningful work.

## Project
DEQODE Earth is sovereign geospatial intelligence for Pacific island governments and climate/coastal monitoring.

Current app lives in:
- `web/` - Next.js app
- `dashboard.py` - Streamlit prototype/dashboard
- `niue_coastal_analysis.py` - coastal analysis script

`web/CLAUDE.md` currently points back to `AGENTS.md`; treat this root file as the canonical agent entry point.

## Stack
- Web: Next.js 16, React 19, Tailwind CSS 4, TypeScript
- Data/auth: Supabase SSR
- Geospatial: Google Earth Engine, Leaflet
- Testing: Vitest in `web/`
- Prototype: Python Streamlit

## Commands
Run web commands from `C:\Dev\deqode-earth\web`:

```powershell
npm run dev
npm run build
npm run lint
npm run test
```

## Routing
- UI/frontend/design work: load and apply the design skills before editing UI.
- Supabase/auth/RLS work: use Supabase-aware review and verify ownership rules.
- Geospatial/data work: preserve data provenance and avoid hard-coded assumptions.
- Deployment/env work: verify Vercel/Supabase state instead of guessing.
- QA/regression work: run the narrowest useful test first, then broaden if risk grows.

## Security
- Never expose service-role keys or geospatial credentials to client code.
- Validate all server inputs.
- Verify user/resource ownership before any mutation.
- Treat government, community, and environmental data as sensitive by default.
- Do not commit `.env*` files or generated secrets.

## Working Rules
- Prefer existing patterns inside `web/` before adding new abstractions.
- Keep edits scoped to the feature or fix requested.
- For UI, preserve DEQODE quality standards: no generic starter-template surfaces, no default Inter/Roboto primary type, and no low-effort gradient-only identity.
- Update this file if durable project facts change.

## Data Operations (2026-06-15)
- Live forecasts and gauges run every 6 hours.
- Brisbane flood mapping runs weekly.
- IDMC, World Bank, PDH.stat, Deltares, and JRC baselines run monthly.
- Historical flood extents are manual-only and retained permanently.
- Open-Meteo history is retained for 30 days; WMIP gauge history for 90 days.
- Failed and abandoned analysis-cache jobs expire after 30 and 7 days respectively.
- Source refreshes must pass coverage checks before replacing the last known-good snapshot.
- `/api/data-health` is the product-facing source freshness and failure contract.

## Analysis route migration + map config fix (2026-06-17)
- `web/api/analyse.py` and `web/api/map-thumb.py` (old Vercel Python functions) replaced by `web/app/api/analyse/route.ts` and `web/app/api/map-thumb/route.ts` Next.js route handlers, backed by `web/lib/gee/coastline.ts` and `web/lib/analysis-period.ts`.
- `web/lib/map-config.ts` — fixed a stale `server.arcgisonline.com` subdomain for the `labels` tile layer (now `services.arcgisonline.com`); kept `darkTerrain` pointing at Canvas/World_Dark_Gray_Base.
- This work existed only as uncommitted local changes for ~2 weeks while `origin/main` advanced independently (auth rewrite, RMAC feature). Reconciled via merge on 2026-06-17 — verified 94/94 tests, clean build, both lineages intact.
- `web/lib/auth/recovery-redirect.ts` (legacy root `/?code=...` Supabase recovery link catch in `middleware.ts`) was lost as an uncommitted, never-staged file during that reconciliation and had to be reconstructed from documented production behavior. Re-verified against the known test case (`/?code=test-reset-code` → `/auth/callback?code=test-reset-code&next=%2Fauth%2Freset&type=recovery`).

## Ocean Intelligence module — live data (2026-06-17)
- New table `ocean_metrics` (migration `008`): `source`, `region_slug`, `metric_type` (`sst`|`ph`), `recorded_date`, `value`, `unit`. Public read, service-role write, same RLS pattern as `flood_zones`.
- `web/lib/ocean/metrics.ts` — pure trend aggregation (rising/falling/stable) shared by the API route; covered by `metrics.test.ts`.
- `/api/ocean?region=<slug>` reads `ocean_metrics`, returns latest SST + pH plus trend direction/delta.
- `OceanModule.tsx` fetches live data, falls back to the original hardcoded per-region copy when no live row exists yet (i.e. before the ingest jobs have run or before Copernicus credentials are added).
- **SST**: `scripts/ingest/ingest_ocean_sst.py` — NOAA Coral Reef Watch CoralTemp via ERDDAP (`oceanwatch.pifsc.noaa.gov`), anonymous, no credential. Runs on the 6-hourly `live` nightly-ingest schedule. Pulls last 14 days per region center point for short-term trend.
- **pH**: `scripts/ingest/ingest_ocean_ph.py` — Copernicus Marine Service `GLOBAL_OMI_HEALTH_carbon_ph_area_averaged` (yearly, global mean — not region-specific; applied uniformly to all regions as a proxy since acidification is a slow globally-coupled signal and no verified region-specific dataset/variable layout was confirmed). Runs on the monthly nightly-ingest schedule.
- **Not yet active**: pH ingestion needs `COPERNICUS_MARINE_USERNAME` / `COPERNICUS_MARINE_PASSWORD` repo secrets — free self-service registration at marine.copernicus.eu, same tier of effort as the existing GEE/TOFI access. Script skips cleanly (exit 0) until those secrets exist, mirroring the optional-credential pattern already used for `ingest_jrc_glofas.py` (`GEE_B64_KEY`).
- Reef, Land, Climate modules remain static/curated — no live source confirmed yet for Reef (NOAA Coral Reef Watch bleaching alerts is the likely candidate) or Land; Climate could reuse the existing CMIP6 GEE pipeline already wired into Coastline rather than a new ingest job.
- Verification: 101/101 tests passed (7 new), full Next.js production build passed.

## Alofi South RMAC MVP (2026-06-15)
- Showcase route: `/rmac/alofi-south`.
- Mobile field workflow records management-plan action, narrative, people, spend, location, evidence photos, consent, and reporting visibility.
- Written drafts recover from device storage after a dropped connection.
- Committee roles (`analyst`, `admin`, `deqode_admin`) can approve or return evidence; contributors can correct and resubmit returned records under the same reference.
- Supabase tables: `rmac_activities`, `rmac_activity_evidence`, and immutable `rmac_activity_audit`; private evidence bucket: `rmac-evidence`.
- All mutations run through authenticated server routes with explicit organisation/ownership checks. Direct authenticated table writes are revoked.
- Database migrations `005` through `007` were applied to production on 2026-06-15.
- Verification: 81 tests passed, focused lint passed, and the full Next.js production build passed.
- Earth client intelligence route: `/rmac/alofi-south/insights`; approved records only, with map, management-plan progress, metrics, evidence timeline and reporting filters.
- Public sample preview: `/showcase/alofi-south/insights`; isolated sample data only.

## Password Recovery (2026-06-15)
- Reset-password matching reads submitted DOM values so browser/password-manager autofill cannot leave React state stale.
- Recovery links preserve the original protected destination; RMAC resets return to `/rmac/alofi-south`.
- Public read-only RMAC showcase: `/showcase/alofi-south`; sample data only and all mutations are intercepted.

## Sign-In Reliability (2026-06-16)
- Protected sign-in now authenticates through the Supabase browser client, verifies the user session, then performs a hard redirect.
- Full protected destinations, including query strings, are preserved through login and unsafe external redirects are rejected.
- Verification: 91 tests passed, focused auth lint passed, and the full production build passed.
- Follow-up hardening: login now posts to `/api/auth/login`, which signs in server-side and returns the protected redirect with Supabase cookies on the same response. This removes the browser/server cookie handoff race.

## Map & UI updates (2026-06-02 — complete)

### Changes
- `web/lib/map-config.ts` — TILE_URLS now uses Google Maps tiles (`mt{s}.google.com/vt/lyrs=m` road, `lyrs=y` satellite hybrid). Removed Esri Dark Gray Canvas and CartoDB entries.
- `web/components/map/MapCanvas.tsx` — defaults to Google Maps Standard tiles. SAT/MAP toggle button (top-right) switches to Google Maps satellite hybrid. Clean rewrite, no Mapbox/Esri dependency.
- `web/components/command/StatusStrip.tsx` — `demoMode` prop removed entirely. Component takes no props. COPRRRA Demo Mode badge deleted.
- `web/app/page.tsx` — `<StatusStrip demoMode />` → `<StatusStrip />`
- `web/app/cases/grantham/page.tsx` — `<StatusStrip demoMode />` → `<StatusStrip />` (was blocking Vercel build with TS error)

### Key decisions
- Google Maps tiles via `mt{s}.google.com` — no API key required, exact consumer-familiar look
- COPRRRA is an event, not the product identity — all event-specific branding removed from base UI
- `/demo` route still exists for internal pre-COPRRRA run-through, but StatusStrip is clean

### 73/73 tests passing · deployed commit: d3cc194

## Phase 7: Grantham & COPRRRA Polish (2026-05-27 — complete)

### New files
- `web/app/cases/grantham/page.tsx` — static RSC case study, ISR revalidate=3600
- `web/components/cases/GranthamFloodMap.tsx` — Leaflet flood polygon, /api/flood-zones?bbox=152.0,-27.8,152.5,-27.3
- `web/components/map/MapContext.tsx` — React context for flyTo: MapProvider, useFlyTo, useRegisterMap
- `web/components/modules/ModuleShell.tsx` — shared layout + MetricCard for all module components
- `web/components/modules/OceanModule.tsx` — static ocean SST + pH per region
- `web/components/modules/ReefModule.tsx` — static NOAA coral bleaching data per region
- `web/components/modules/LandModule.tsx` — static SLR exposure (1m/2m/5m) per region
- `web/components/modules/ClimateModule.tsx` — static CMIP6 temperature + rainfall projections
- `web/components/modules/DisplacementModule.tsx` — live /api/displacement + trend bar chart
- `web/app/demo/page.tsx` — internal COPRRRA demo checklist page at /demo

### Key decisions
- flyTo wiring: MapProvider wraps CommandCenter main content; MapCanvasClient registers ref via callback ref (not useEffect — next/dynamic resolves asynchronously, useEffect fires too early); RegionRowClient calls useFlyTo on select
- Module stubs: replaced with per-module RSC components (static data objects keyed by region.slug); DisplacementModule is the only live API call
- StatusStrip: now imports REGION_LIST from regions.ts (was LOCATIONS_LIST from locations.ts — only had 8 SIDS, now 10 including Brisbane + Grantham)
- demoMode: REMOVED — StatusStrip takes no props, COPRRRA badge deleted (see 2026-06-02 update above)
- IntelligencePanel: gold "View Case Study →" CTA for regionType==="managed_retreat" regions (Grantham)
- Grantham page: hardcoded QRA stats (160 properties, 12 lives, 18.9m peak, 2013 relocation) from QLD Floods Commission of Inquiry 2012
- /demo route: internal only, not in navigation — open directly at /demo before COPRRRA presentation

### Demo readiness
- COPRRRA ship target: 2 September 2026 (Brisbane)
- All 6 demo URLs verified: /, /?region=tuvalu, /region/tuvalu/coastline, /?region=brisbane, /compare/tuvalu/brisbane, /cases/grantham
- Pre-warm required: run Tuvalu coastline analysis in the demo browser the night before (localStorage cache)
- Demo checklist: /demo route has step-by-step flow + failsafe instructions for each step
