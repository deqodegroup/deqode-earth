"""
Open-Meteo Flood API -> Supabase flood_forecasts
Brisbane River discharge forecast: 92 days forward + 30 days past.
No auth required.

Paid upgrade option:
  Google Flood Forecasting API (https://developers.google.com/flood-forecasting)
  - AI-driven 7-day riverine forecasts for 5,000+ verified gauge locations
  - Free once approved via waitlist
  - Would replace this Open-Meteo integration with higher accuracy AI forecasts
  - Recommended: apply for waitlist at https://developers.google.com/flood-forecasting
"""
import os
import sys
import logging
import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

OPEN_METEO_URL = "https://flood-api.open-meteo.com/v1/flood"

# Brisbane River at City: -27.47, 153.02 (from lib/regions.ts center)
BRISBANE = {"lat": -27.47, "lon": 153.02}


def main():
    try:
        params = {
            "latitude": BRISBANE["lat"],
            "longitude": BRISBANE["lon"],
            "daily": "river_discharge,river_discharge_mean,river_discharge_max,river_discharge_p25,river_discharge_p75",
            "forecast_days": 92,
            "past_days": 30,
        }
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        log.warning(f"WARN: open_meteo fetch failed: {e}")
        sys.exit(1)

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    discharges = daily.get("river_discharge", [])
    discharges_mean = daily.get("river_discharge_mean", [])

    if not dates:
        log.error("FAIL: open_meteo -- empty response")
        sys.exit(1)

    records = []
    for i, d in enumerate(dates):
        discharge = discharges[i] if i < len(discharges) else None
        discharge_mean = discharges_mean[i] if i < len(discharges_mean) else None
        effective_discharge = discharge or discharge_mean
        if effective_discharge is None:
            continue
        records.append({
            "source": "open_meteo",
            "forecast_date": d,
            "latitude": BRISBANE["lat"],
            "longitude": BRISBANE["lon"],
            "discharge_m3s": round(float(effective_discharge), 2),
            "scenario": "current",
        })

    if records:
        if len(records) < 90:
            log.error(
                "FAIL: open_meteo validation rejected only %s forecast records",
                len(records),
            )
            sys.exit(1)
        # on_conflict matches UNIQUE(source, forecast_date, latitude, longitude) in schema
        SUPABASE.table("flood_forecasts").upsert(
            records,
            on_conflict="source,forecast_date,latitude,longitude",
        ).execute()
        log.info(f"OK: open_meteo -- {len(records)} forecast records upserted")
    else:
        log.error("FAIL: open_meteo -- no records to upsert")
        sys.exit(1)


if __name__ == "__main__":
    main()
