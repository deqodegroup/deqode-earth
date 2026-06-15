CREATE TABLE IF NOT EXISTS data_source_health (
  source text PRIMARY KEY,
  display_name text NOT NULL,
  cadence text NOT NULL,
  status text NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('unknown', 'healthy', 'failed')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_source_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_source_health_public_read"
  ON data_source_health FOR SELECT USING (true);

CREATE POLICY "data_source_health_service_write"
  ON data_source_health FOR ALL
  USING (auth.role() = 'service_role');

INSERT INTO data_source_health (source, display_name, cadence)
VALUES
  ('open_meteo', 'Open-Meteo Brisbane forecast', '6-hourly'),
  ('wmip', 'Queensland live gauges', '6-hourly'),
  ('bcc', 'Brisbane flood awareness mapping', 'weekly'),
  ('qld_2011', 'Queensland 2011 flood extent', 'manual'),
  ('idmc', 'Pacific disaster displacement', 'monthly'),
  ('worldbank', 'World Bank migration and population', 'monthly'),
  ('pdh_stat', 'Pacific population projections', 'monthly'),
  ('deltares', 'Pacific coastal inundation depth', 'monthly'),
  ('jrc_glofas', 'Brisbane flood hazard depth', 'monthly')
ON CONFLICT (source) DO UPDATE
SET display_name = EXCLUDED.display_name,
    cadence = EXCLUDED.cadence;

CREATE OR REPLACE FUNCTION record_data_source_run(
  p_source text,
  p_status text,
  p_cadence text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('healthy', 'failed') THEN
    RAISE EXCEPTION 'invalid source status';
  END IF;

  INSERT INTO data_source_health (
    source,
    display_name,
    cadence,
    status,
    last_attempt_at,
    last_success_at,
    consecutive_failures,
    updated_at
  )
  VALUES (
    p_source,
    p_source,
    p_cadence,
    p_status,
    now(),
    CASE WHEN p_status = 'healthy' THEN now() ELSE NULL END,
    CASE WHEN p_status = 'failed' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (source) DO UPDATE
  SET cadence = EXCLUDED.cadence,
      status = EXCLUDED.status,
      last_attempt_at = now(),
      last_success_at = CASE
        WHEN p_status = 'healthy' THEN now()
        ELSE data_source_health.last_success_at
      END,
      consecutive_failures = CASE
        WHEN p_status = 'healthy' THEN 0
        ELSE data_source_health.consecutive_failures + 1
      END,
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION record_data_source_run(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_data_source_run(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION replace_displacement_source_records(
  p_source text,
  p_records jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF p_source NOT IN ('worldbank', 'idmc') THEN
    RAISE EXCEPTION 'unsupported displacement source';
  END IF;

  IF jsonb_typeof(p_records) <> 'array' OR jsonb_array_length(p_records) = 0 THEN
    RAISE EXCEPTION 'p_records must be a non-empty JSON array';
  END IF;

  DELETE FROM displacement_records WHERE source = p_source;

  INSERT INTO displacement_records (
    source,
    country_code,
    country_name,
    event_date,
    year,
    cause,
    displaced_count,
    net_migration,
    population,
    data_type
  )
  SELECT
    p_source,
    record.country_code,
    record.country_name,
    record.event_date,
    record.year,
    record.cause,
    record.displaced_count,
    record.net_migration,
    record.population,
    record.data_type
  FROM jsonb_to_recordset(p_records) AS record(
    country_code char(2),
    country_name text,
    event_date date,
    year integer,
    cause text,
    displaced_count integer,
    net_migration integer,
    population integer,
    data_type text
  )
  WHERE record.country_code IS NOT NULL
    AND record.year BETWEEN 1900 AND 2100
    AND record.data_type IN ('annual', 'event');

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION replace_displacement_source_records(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_displacement_source_records(text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION apply_data_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  forecast_rows integer;
  gauge_rows integer;
  cache_rows integer;
BEGIN
  DELETE FROM flood_forecasts
  WHERE source = 'open_meteo'
    AND forecast_date < current_date - 30;
  GET DIAGNOSTICS forecast_rows = ROW_COUNT;

  DELETE FROM flood_forecasts
  WHERE source = 'wmip'
    AND forecast_date < current_date - 90;
  GET DIAGNOSTICS gauge_rows = ROW_COUNT;

  DELETE FROM analysis_cache
  WHERE (status = 'failed' AND created_at < now() - interval '30 days')
     OR (status IN ('pending', 'running') AND created_at < now() - interval '7 days');
  GET DIAGNOSTICS cache_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'open_meteo_deleted', forecast_rows,
    'wmip_deleted', gauge_rows,
    'stale_cache_deleted', cache_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION apply_data_retention() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_data_retention() TO service_role;
