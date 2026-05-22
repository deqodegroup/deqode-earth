# Phase 3: Brisbane & Pacific Data Pipeline — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Source:** Deep research — 4 parallel agents covering Australian data, global flood APIs, Pacific displacement data, and cloud architecture

---

<domain>
## Phase Boundary

Phase 3 delivers real data into the DEQODE EARTH intelligence platform. It replaces static risk scores with live ingested data from authoritative sources. By the end of Phase 3, clicking Tuvalu shows real displacement counts; clicking Brisbane shows real flood zones; the IntelligencePanel displays verified numbers, not placeholders.

**In scope:**
- Supabase PostGIS schema (4 tables with spatial indexes)
- GitHub Actions nightly ingestion pipeline (Python, 4 data sources)
- Brisbane flood data (property-level zones + 2011 historical + live gauges)
- Pacific displacement data (IDMC + World Bank + PDH.stat)
- Flood depth intelligence (Deltares coastal + JRC GloFAS + Open-Meteo forecast)
- Next.js API routes serving all data to the frontend
- IntelligencePanel wired to real data (replacing static mock scores)

**Out of scope for Phase 3:**
- Compare View (/compare route) — Phase 4
- MNDWI coastline algorithm fix — Phase 5
- Nightly GEE analysis automation — Phase 6
- Grantham case study page — Phase 7

</domain>

<decisions>
## Implementation Decisions

### Architecture — LOCKED

- **Storage:** Supabase PostgreSQL + PostGIS. PostGIS enabled via `CREATE EXTENSION postgis`. NOT BigQuery.
- **Ingestion runtime:** GitHub Actions Ubuntu runners. Full geopandas/rasterio/shapely/GDAL stack available. NOT Cloud Run or Vercel functions.
- **Ingestion schedule:** `cron: '0 18 * * *'` (04:00 AEST). Plus `workflow_dispatch` for manual triggers.
- **API serving:** Next.js API routes in `web/app/api/`. Supabase client queries PostGIS directly. NO separate Flask/FastAPI server.
- **Caching:** Next.js ISR with `revalidate: 3600`. Supabase `updated_at` freshness check. Analysis results cached in `analysis_cache` table keyed by `(country_code, analysis_type, params_hash)`.
- **Monthly cost target:** $0 (GitHub Actions free tier: 2,000 min/month private or unlimited public; Supabase free: 500MB, 5GB bandwidth)

### Ingestion pattern — LOCKED

- All 4 ingestion jobs run independently via `asyncio.gather(..., return_exceptions=True)`
- One source failing does NOT block others
- Each job logs: `"OK: {source} — {N} records upserted"` or `"WARN: {source} failed: {error}"`
- Upsert pattern: `SUPABASE.table('...').upsert(records, on_conflict='...')` — idempotent
- GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GLOFAS_API_KEY`, `NASA_EARTHDATA_TOKEN`

### Supabase PostGIS Schema — LOCKED

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE flood_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,           -- 'bcc', 'qld_2011', 'qfao'
  flood_class text,               -- 'high', 'medium', 'low', 'very_low'
  annual_recurrence_interval integer,
  council text,
  country_code char(2),
  region_slug text,               -- matches lib/regions.ts slugs
  geometry geometry(MultiPolygon, 4326),
  data_date date,
  ingested_at timestamptz DEFAULT now(),
  UNIQUE(source, flood_class, council)
);
CREATE INDEX flood_zones_geom_idx ON flood_zones USING GIST (geometry);
CREATE INDEX flood_zones_region_idx ON flood_zones (region_slug);

CREATE TABLE flood_forecasts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'open_meteo',  -- 'open_meteo', 'glofas_ewds'
  forecast_date date NOT NULL,
  location geometry(Point, 4326),
  latitude numeric,
  longitude numeric,
  discharge_m3s numeric,
  return_period_years integer,    -- 10, 50, 100, 200, 500
  inundation_depth_m numeric,     -- from JRC GloFAS static maps
  coastal_depth_m numeric,        -- from Deltares Planetary Computer
  scenario text,                  -- 'current', '2050_rcp45', '2050_rcp85'
  location_hash text GENERATED ALWAYS AS (
    encode(sha256((source || forecast_date::text || latitude::text || longitude::text)::bytea), 'hex')
  ) STORED,
  ingested_at timestamptz DEFAULT now(),
  UNIQUE(source, forecast_date, location_hash)
);
CREATE INDEX flood_forecasts_geom_idx ON flood_forecasts USING GIST (location);
CREATE INDEX flood_forecasts_date_idx ON flood_forecasts (forecast_date DESC);

CREATE TABLE displacement_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,           -- 'idmc', 'worldbank', 'pdh_stat'
  country_code char(2) NOT NULL,  -- ISO 3166-1 alpha-2
  country_name text,
  event_date date,
  year integer,
  cause text,                     -- 'cyclone', 'flood', 'drought', 'sea_level_rise'
  displaced_count integer,
  net_migration integer,          -- World Bank SM.POP.NETM
  population integer,             -- PDH.stat baseline
  location geometry(Point, 4326),
  admin1 text,
  data_type text,                 -- 'event', 'annual', 'projection'
  ingested_at timestamptz DEFAULT now()
);
CREATE INDEX displacement_country_idx ON displacement_records (country_code, year DESC);
CREATE INDEX displacement_geom_idx ON displacement_records USING GIST (location);

CREATE TABLE analysis_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code char(2),
  region_slug text,
  analysis_type text NOT NULL,    -- 'coastline_change', 'flood_extent', 'flood_depth'
  params_hash text NOT NULL,
  status text DEFAULT 'pending',  -- 'pending', 'running', 'complete', 'failed'
  result jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(region_slug, analysis_type, params_hash)
);
```

### Brisbane Data Sources — LOCKED

**Priority 1 — BCC Flood Awareness FeatureServer (no auth, live)**
```
# Overall flood risk (high/med/low/very low)
https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_Flood_Risk_Overall/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson

# Feb 2022 historic flood extent
https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/Flood_Awareness_Historic_Brisbane_River_and_Creek_Floods_Feb2022/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson
```
Paginate with `resultOffset`. Load into `flood_zones` table with `source='bcc'`, `region_slug='brisbane'`.

**Priority 2 — QLD Flood Extent 2011 (Grantham + Brisbane polygon)**
Download GPKG from: `https://www.data.qld.gov.au/dataset/flood-extent-series`
Store as `source='qld_2011'`, `region_slug='grantham'` for Lockyer Valley polygons.

**Priority 3 — QLD WMIP Real-Time Gauge API (live JSON, 2025 docs)**
```
https://water-monitoring.information.qld.gov.au/
API docs: https://water-monitoring.information.qld.gov.au/wini/Documents/WMIP_API_2025.pdf
```
Fetch hourly gauge readings for: Brisbane River (gauge at City), Lockyer Creek at Grantham.
Store as `flood_forecasts` with `source='wmip'`.

**Paid upgrade option: Google Flood Forecasting API**
- Waitlist-gated, free once approved: https://developers.google.com/flood-forecasting
- AI-driven 7-day riverine forecasts for 5,000+ verified gauge locations
- Would replace Open-Meteo as the real-time forecast layer with higher accuracy
- Recommend: apply for waitlist now, integrate in Phase 4 if approved

### Pacific Displacement Data Sources — LOCKED

**Primary: IDMC GIDD API (free, no auth)**
```python
# Disaster displacement by country
GET https://helix-tools-api.idmcdb.org/external-api/gidd/disasters/?country=FJI
GET https://helix-tools-api.idmcdb.org/external-api/gidd/disasters/?country=VUT
# Countries: FJI, VUT, SLB, PNG, TON, WSM, MHL, KIR, TUV, NIU
```
Parse JSON into `displacement_records` with `source='idmc'`, `data_type='event'`.

**Secondary: World Bank wbgapi (free, pip install)**
```python
import wbgapi as wb
# Net migration (SM.POP.NETM) 1960-present
df = wb.data.DataFrame('SM.POP.NETM', economy=['TV','KI','VU','SB','FJ','MH','TO','WS','NU'], time=range(2000,2025))
# Population (SP.POP.TOTL)
df2 = wb.data.DataFrame('SP.POP.TOTL', economy=['TV','KI','VU','SB','FJ','MH','TO','WS','NU'], time=range(2000,2025))
```
Store as `source='worldbank'`, `data_type='annual'`.

**Tertiary: PDH.stat SDMX (SPC, free SDMX API)**
```python
import requests
r = requests.get("https://stats-nsi-stable.pacificdata.org/rest/data/SPC,DF_POP_PROJ/all/?format=csvfilewithlabels")
```
Population projections to 2050 for all 22 Pacific territories. Store as `source='pdh_stat'`.

**Paid upgrade option: EM-DAT (free registration required)**
- emdat.be — 126 years of disaster events, GraphQL API
- Adds historical cyclone frequency trends and economic damage data
- Register at emdat.be (non-commercial use, no cost)
- Recommend: register and integrate in Phase 3 as optional bonus data layer

### Flood Depth Intelligence Sources — LOCKED

**Deltares Global Flood Maps via Planetary Computer (no auth)**
```python
import pystac_client
import planetary_computer

catalog = pystac_client.Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1",
    modifier=planetary_computer.sign_inplace,
)
search = catalog.search(
    collections=["deltares-floods"],
    query={
        "deltares:dem_name": {"eq": "MERITDEM"},
        "deltares:resolution": {"eq": "90"},
    }
)
```
Returns coastal inundation depth maps at 7 return periods + 2050 projections.
**Critical for Pacific SIDS** — only dataset covering small island coastal inundation.
Extract depth values for each SIDS bounding box → store in `flood_forecasts` with `source='deltares'`.

**JRC GloFAS Flood Hazard Maps v2.1 via GEE (existing service account)**
```python
import ee
ee.Initialize(service_account=..., key_file=...)
dataset = ee.ImageCollection('JRC/CEMS_GLOFAS/FloodHazard/v2_1')
rp100 = dataset.select('RP100_depth').mosaic()
brisbane = ee.Geometry.Rectangle([152.7, -27.7, 153.5, -27.1])
```
Extract max inundation depth at 100yr and 500yr return periods for Brisbane bbox.
Store as `source='jrc_glofas'` in `analysis_cache`.

**Open-Meteo Flood API (zero auth, instant)**
```python
import requests
r = requests.get("https://flood-api.open-meteo.com/v1/flood", params={
    "latitude": -27.47, "longitude": 153.02,
    "daily": "river_discharge,river_discharge_mean,river_discharge_max,river_discharge_p25,river_discharge_p75",
    "forecast_days": 92, "past_days": 30
})
```
Live Brisbane river discharge — 210-day forecast ensemble. Store as `source='open_meteo'`.

**Paid upgrade option: GloFAS EWDS historical reanalysis (free registration)**
- Register at ewds.climate.copernicus.eu (free, API key)
- Adds 1979-present daily discharge reanalysis for return period calibration
- `pip install cdsapi`, configure ~/.cdsapirc
- Recommend: register now, integrate as bonus data layer in Phase 3

**Paid upgrade option: DEA WOfS STAC (35yr flood frequency)**
- Free via public AWS S3 + pystac-client
- `collections=["wofs_ls_summary_alltime"]` for Brisbane
- Adds 35yr flood frequency heatmap at 25m — powerful historical layer
- No auth, no cost — include in Phase 3 if time permits

### Next.js API Routes — LOCKED

All routes in `web/app/api/`. Use Supabase server client (not anon client) for data queries.

```
GET /api/flood-zones?bbox=152.6,-27.8,153.5,-27.2
  → ST_AsGeoJSON(geometry) WHERE ST_Intersects(geometry, ST_MakeEnvelope(...))
  → Returns GeoJSON FeatureCollection

GET /api/forecasts/open-meteo?lat=-27.47&lng=153.02&days=30
  → Passes through to Open-Meteo API (or serves cached Supabase data)
  → Returns JSON timeseries

GET /api/displacement?country=FJ&from=2020-01-01&to=2024-12-31
  → Queries displacement_records filtered by country_code + date range
  → Returns { events: [], total_displaced: N, trend: [] }

GET /api/flood-depth?region=brisbane&return_period=100
  → Queries analysis_cache for pre-computed JRC GloFAS depth
  → Returns { depth_m: N, source: 'jrc_glofas', computed_at: '...' }

GET /api/flood-depth?region=tuvalu&scenario=2050_rcp85
  → Returns Deltares coastal inundation depth for SIDS
  → Returns { depth_m: N, source: 'deltares', scenario: '2050_rcp85' }

GET /api/countries
  → Static JSON from lib/regions.ts + displacement summary stats
  → Cache: revalidate 3600
```

### IntelligencePanel Data Wiring — LOCKED

Replace static mock risk scores with live data:
- `displaced_count` → IDMC GIDD latest annual figure for country
- `net_migration` → World Bank SM.POP.NETM latest 5-year period
- `flood_risk_zone` → BCC flood_class for Brisbane; 'high' for SIDS by SLR exposure
- `coastline_change_rate` → from analysis_cache (if available) or GEE live call
- `inundation_depth_100yr` → JRC GloFAS for Brisbane; Deltares for SIDS

### Claude's Discretion

- Exact Supabase client instantiation pattern (server vs client component)
- Error boundary and loading state handling in API routes
- GitHub Actions job timeout and retry settings
- WMIP gauge station IDs for Brisbane River and Lockyer Creek at Grantham (find in API docs)
- Whether to run Deltares ingestion in GitHub Actions or as a one-time setup script (Deltares data is static, not nightly)
- RLS policy on flood_zones and displacement_records (read-only public access vs auth-gated)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing codebase
- `web/lib/regions.ts` — 10 region definitions, slugs, country codes — MUST match in all DB inserts
- `web/lib/map-config.ts` — map constants, bounding boxes per region — use for bbox queries
- `web/components/command/IntelligencePanel.tsx` — current data shape expected by frontend
- `web/components/command/RiskScoreHUD.tsx` — how risk scores are consumed
- `web/middleware.ts` — auth middleware pattern
- `web/next.config.ts` — security headers, existing config

### Project config
- `.planning/REQUIREMENTS.md` — requirement IDs EARTH-07 through EARTH-12
- `.planning/STATE.md` — environment variables, GEE service account details

### External APIs (verify before implementing)
- BCC FeatureServer: https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/
- IDMC GIDD: https://helix-tools-api.idmcdb.org/external-api/
- Open-Meteo Flood: https://flood-api.open-meteo.com/v1/flood
- Deltares Planetary Computer: https://planetarycomputer.microsoft.com/api/stac/v1
- PDH.stat SDMX: https://stats-nsi-stable.pacificdata.org/rest/

</canonical_refs>

<specifics>
## Specific Implementation Details

### GitHub Actions workflow file location
`.github/workflows/nightly-ingest.yml` (at repo root `c:/Dev/deqode-earth/`)

### Python ingestion scripts location
`scripts/ingest/` at repo root (NOT inside `web/`)

### Python dependencies for ingestion
```
geopandas
shapely
requests
psycopg2-binary
supabase
python-dateutil
pystac-client
planetary-computer
xarray
scipy
wbgapi
```

### Region slug to country code mapping (from lib/regions.ts)
```
niue → NU, tuvalu → TV, kiribati → KI, marshall-islands → MH
fiji → FJ, vanuatu → VU, solomon-islands → SB, png-coastal → PG
brisbane → AU, grantham → AU
```

### WMIP gauge stations for Grantham/Brisbane
Lockyer Creek at Grantham: search WMIP for station near -27.47, 152.33
Brisbane River at City: search WMIP for station near -27.47, 153.02

### Paid service options to present (do NOT block on these — present as upgrade path)
1. **Google Flood Forecasting API** — apply for waitlist, replace Open-Meteo for Brisbane if approved
2. **Planet Labs** (paid ~$500/mo) — daily 3m imagery for Pacific SIDS coastline change; far superior to Sentinel-2 revisit times; mention as the "production upgrade" option
3. **Copernicus GFM** (free but registration) — near-real-time SAR flood extent from Sentinel-1; limited Pacific coverage but excellent for Brisbane active events
4. **IBM Environmental Intelligence Suite** (paid) — enterprise-grade climate risk API; mention as the "enterprise tier" option for government clients
5. **Maxar SecureWatch** (paid) — highest res archive imagery for SIDS; mention for future premium tier

</specifics>

<deferred>
## Deferred to Later Phases

- Compare View (/compare route) — Phase 4
- MNDWI coastline algorithm fix — Phase 5
- Live GEE analysis for all 8 SIDS — Phase 5
- IOM DTM displacement flow map — Phase 6
- Nightly GEE automation — Phase 6
- Grantham case study page — Phase 7
- Planet Labs daily imagery integration — post-COPRRRA
- IBM Environmental Intelligence Suite — enterprise tier, post-COPRRRA

</deferred>

---
*Phase: 03-brisbane-data-pipeline*
*Context gathered: 2026-05-22 via 4-agent parallel research*
