-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- flood_zones
-- Sources: 'bcc', 'qld_2011', 'qfao'
-- region_slug matches lib/regions.ts slugs exactly
-- ============================================================
CREATE TABLE IF NOT EXISTS flood_zones (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source                    text NOT NULL,
  flood_class               text,
  annual_recurrence_interval integer,
  council                   text,
  country_code              char(2),
  region_slug               text,
  geometry                  geometry(MultiPolygon, 4326),
  data_date                 date,
  ingested_at               timestamptz DEFAULT now(),
  UNIQUE(source, flood_class, council)
);
CREATE INDEX IF NOT EXISTS flood_zones_geom_idx ON flood_zones USING GIST (geometry);
CREATE INDEX IF NOT EXISTS flood_zones_region_idx ON flood_zones (region_slug);

-- RLS: public read, no public write
ALTER TABLE flood_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flood_zones_public_read" ON flood_zones FOR SELECT USING (true);
CREATE POLICY "flood_zones_service_write" ON flood_zones FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- flood_zones_in_bbox
-- Returns flood zones intersecting a lon/lat bounding box.
-- Used by: web/app/api/flood-zones/route.ts via supabase.rpc()
-- ============================================================
CREATE OR REPLACE FUNCTION flood_zones_in_bbox(
  p_minx numeric,
  p_miny numeric,
  p_maxx numeric,
  p_maxy numeric
)
RETURNS SETOF flood_zones
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM flood_zones
  WHERE ST_Intersects(
    geometry,
    ST_MakeEnvelope(p_minx, p_miny, p_maxx, p_maxy, 4326)
  );
$$;

-- ============================================================
-- flood_forecasts
-- Sources: 'open_meteo', 'glofas_ewds', 'wmip', 'deltares', 'jrc_glofas'
-- ============================================================
CREATE TABLE IF NOT EXISTS flood_forecasts (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source                text NOT NULL DEFAULT 'open_meteo',
  forecast_date         date NOT NULL,
  location              geometry(Point, 4326),
  latitude              numeric,
  longitude             numeric,
  discharge_m3s         numeric,
  return_period_years   integer,
  inundation_depth_m    numeric,
  coastal_depth_m       numeric,
  scenario              text,
  location_hash         text GENERATED ALWAYS AS (
    encode(sha256((source || forecast_date::text || latitude::text || longitude::text)::bytea), 'hex')
  ) STORED,
  ingested_at           timestamptz DEFAULT now(),
  UNIQUE(source, forecast_date, location_hash)
);
CREATE INDEX IF NOT EXISTS flood_forecasts_geom_idx ON flood_forecasts USING GIST (location);
CREATE INDEX IF NOT EXISTS flood_forecasts_date_idx ON flood_forecasts (forecast_date DESC);

ALTER TABLE flood_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flood_forecasts_public_read" ON flood_forecasts FOR SELECT USING (true);
CREATE POLICY "flood_forecasts_service_write" ON flood_forecasts FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- displacement_records
-- Sources: 'idmc', 'worldbank', 'pdh_stat'
-- country_code: ISO 3166-1 alpha-2 (NU, TV, FJ, VU, SB, PW, KI, MH, PG, TO, WS, AU)
-- ============================================================
CREATE TABLE IF NOT EXISTS displacement_records (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source           text NOT NULL,
  country_code     char(2) NOT NULL,
  country_name     text,
  event_date       date,
  year             integer,
  cause            text,
  displaced_count  integer,
  net_migration    integer,
  population       integer,
  location         geometry(Point, 4326),
  admin1           text,
  data_type        text,
  ingested_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS displacement_country_idx ON displacement_records (country_code, year DESC);
CREATE INDEX IF NOT EXISTS displacement_geom_idx ON displacement_records USING GIST (location);

ALTER TABLE displacement_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "displacement_public_read" ON displacement_records FOR SELECT USING (true);
CREATE POLICY "displacement_service_write" ON displacement_records FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- analysis_cache
-- analysis_type: 'coastline_change', 'flood_extent', 'flood_depth'
-- status: 'pending', 'running', 'complete', 'failed'
-- ============================================================
CREATE TABLE IF NOT EXISTS analysis_cache (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code  char(2),
  region_slug   text,
  analysis_type text NOT NULL,
  params_hash   text NOT NULL,
  status        text DEFAULT 'pending',
  result        jsonb,
  error         text,
  created_at    timestamptz DEFAULT now(),
  completed_at  timestamptz,
  UNIQUE(region_slug, analysis_type, params_hash)
);

ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analysis_cache_public_read" ON analysis_cache FOR SELECT USING (true);
CREATE POLICY "analysis_cache_service_write" ON analysis_cache FOR ALL
  USING (auth.role() = 'service_role');
