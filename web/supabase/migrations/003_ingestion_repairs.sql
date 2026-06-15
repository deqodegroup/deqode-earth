CREATE OR REPLACE FUNCTION replace_pdh_population_records(p_records jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF jsonb_typeof(p_records) <> 'array' THEN
    RAISE EXCEPTION 'p_records must be a JSON array';
  END IF;

  DELETE FROM displacement_records
  WHERE source = 'pdh_stat';

  INSERT INTO displacement_records (
    source,
    country_code,
    country_name,
    year,
    population,
    data_type
  )
  SELECT
    'pdh_stat',
    record.country_code,
    record.country_name,
    record.year,
    record.population,
    'projection'
  FROM jsonb_to_recordset(p_records) AS record(
    country_code char(2),
    country_name text,
    year integer,
    population integer
  )
  WHERE record.country_code IS NOT NULL
    AND record.year IS NOT NULL
    AND record.population >= 0;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION replace_pdh_population_records(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION replace_pdh_population_records(jsonb) FROM anon;
REVOKE ALL ON FUNCTION replace_pdh_population_records(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION replace_pdh_population_records(jsonb) TO service_role;

DELETE FROM flood_zones
WHERE source = 'bcc';

DELETE FROM displacement_records
WHERE source = 'pdh_stat';
