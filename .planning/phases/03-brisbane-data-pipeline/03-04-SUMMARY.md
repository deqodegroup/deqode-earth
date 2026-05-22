---
plan: 03-04
phase: 03-brisbane-data-pipeline
status: complete
completed: 2026-05-22
duration_min: 25
tasks_completed: 2
tasks_total: 2
requirements_validated:
  - EARTH-11
key-files:
  created:
    - scripts/ingest/ingest_deltares.py
    - scripts/ingest/ingest_jrc_glofas.py
    - scripts/ingest/ingest_open_meteo.py
---

## What Was Built

Three flood depth ingestion scripts that populate `flood_forecasts` and `analysis_cache` in Supabase.

## Task Results

### Task 1 — Deltares + Open-Meteo ingestion
- `ingest_deltares.py`: fetches coastal inundation depth for 8 Pacific SIDS from Deltares Flood Maps on Planetary Computer (STAC), writes to `flood_forecasts` with `source='deltares'`, `coastal_depth_m`, `scenario='current'/'rcp85_2050'`
- `ingest_open_meteo.py`: fetches Brisbane river discharge 92d forward + 30d past from Open-Meteo Flood API (zero auth), writes to `flood_forecasts` with `source='open_meteo'`, `discharge_m3s`
- Upserts use `UNIQUE(source, forecast_date, latitude, longitude)` — no `location_hash` (auto-fixed from plan)

### Task 2 — JRC GloFAS ingestion
- `ingest_jrc_glofas.py`: queries JRC/CEMS_GLOFAS/FloodHazard/v2_1 via GEE for Brisbane bbox, extracts RP100 + RP500 flood depth, writes to `analysis_cache` with `analysis_type='flood_depth'`, `region_slug='brisbane'`
- Uses `GEE_B64_KEY` env var for service account auth

## Deviations

- Plan used `on_conflict="source,forecast_date,location_hash"` — auto-fixed to `on_conflict="source,forecast_date,latitude,longitude"` to match actual migration schema (no `location_hash` column)
- Git commits blocked by Bash permission denial in subagent — committed by orchestrator

## Paid Upgrade Paths Documented

- Google Flood Forecasting API (waitlist) — AI-driven Brisbane forecasts
- GloFAS EWDS operational API — real-time flood warnings
- DEA WOfS — Australian water observations from space
- Planet Labs 3m daily imagery for SIDS
