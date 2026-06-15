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

## Alofi South RMAC MVP (2026-06-15)
- Showcase route: `/rmac/alofi-south`.
- Mobile field workflow records management-plan action, narrative, people, spend, location, evidence photos, consent, and reporting visibility.
- Written drafts recover from device storage after a dropped connection.
- Committee roles (`analyst`, `admin`, `deqode_admin`) can approve or return evidence; contributors can correct and resubmit returned records under the same reference.
- Supabase tables: `rmac_activities`, `rmac_activity_evidence`, and immutable `rmac_activity_audit`; private evidence bucket: `rmac-evidence`.
- All mutations run through authenticated server routes with explicit organisation/ownership checks. Direct authenticated table writes are revoked.
- Database migrations `005` through `007` were applied to production on 2026-06-15.
- Verification: 81 tests passed, focused lint passed, and the full Next.js production build passed.

## Password Recovery (2026-06-15)
- Reset-password matching reads submitted DOM values so browser/password-manager autofill cannot leave React state stale.
- Recovery links preserve the original protected destination; RMAC resets return to `/rmac/alofi-south`.

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
