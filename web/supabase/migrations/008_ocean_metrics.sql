-- ============================================================
-- ocean_metrics
-- Sources: 'noaa_coraltemp' (SST, daily, anonymous ERDDAP),
--          'copernicus_marine' (pH, monthly, free registered account)
-- region_slug matches lib/regions.ts slugs exactly
-- ============================================================
CREATE TABLE IF NOT EXISTS ocean_metrics (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source        text NOT NULL,
  region_slug   text NOT NULL,
  metric_type   text NOT NULL CHECK (metric_type IN ('sst', 'ph')),
  recorded_date date NOT NULL,
  value         numeric NOT NULL,
  unit          text NOT NULL,
  ingested_at   timestamptz DEFAULT now(),
  UNIQUE(source, region_slug, metric_type, recorded_date)
);
CREATE INDEX IF NOT EXISTS ocean_metrics_region_idx ON ocean_metrics (region_slug, metric_type, recorded_date DESC);

-- RLS: public read, no public write
ALTER TABLE ocean_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocean_metrics_public_read" ON ocean_metrics FOR SELECT USING (true);
CREATE POLICY "ocean_metrics_service_write" ON ocean_metrics FOR ALL
  USING (auth.role() = 'service_role');
