"""
QLD WMIP Real-Time Gauge API -> Supabase flood_forecasts

Fetches live river level / discharge readings for:
  - Brisbane River at City:       approx -27.47, 153.02
  - Lockyer Creek at Grantham:    approx -27.47, 152.33

Target table: flood_forecasts
  UNIQUE(source, forecast_date, latitude, longitude)

NOTE: The flood_forecasts table does NOT have a location_hash column.
The UNIQUE constraint is on (source, forecast_date, latitude, longitude).
Do NOT include location_hash in upsert records.

WMIP API base: https://water-monitoring.information.qld.gov.au/
Docs: https://water-monitoring.information.qld.gov.au/wini/Documents/WMIP_API_2025.pdf

The script auto-discovers the nearest WMIP station to each target coordinate
using a spatial bounding box search, then fetches the latest reading.

Env vars required:
  SUPABASE_URL          -- Supabase project URL
  SUPABASE_SERVICE_KEY  -- Service role key (bypasses RLS for write)
"""

import os
import sys
import logging
import requests
from datetime import date
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

WMIP_BASE = "https://water-monitoring.information.qld.gov.au"

# Target gauge locations: (display_name, lat, lon, search_radius_km)
TARGET_GAUGES = [
    ("Brisbane River at City", -27.47, 153.02, 5.0),
    ("Lockyer Creek at Grantham", -27.47, 152.33, 10.0),
]


def find_station(lat: float, lon: float, radius_km: float) -> dict | None:
    """
    Search WMIP for the nearest station to given coordinates.
    Uses a bounding box derived from the radius to query the station endpoint.
    Returns the closest matching station dict, or None if not found.
    """
    try:
        delta = radius_km / 111.0  # approximate degrees per km
        url = f"{WMIP_BASE}/wini/monitoring/station"
        params = {
            "minLat": lat - delta,
            "maxLat": lat + delta,
            "minLon": lon - delta,
            "maxLon": lon + delta,
            "f": "json",
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # Response may be a list of stations or wrapped in a dict
        stations = data if isinstance(data, list) else data.get("stations", data.get("features", []))

        if stations:
            # Return the closest station by Manhattan distance in degrees
            return min(
                stations,
                key=lambda s: (
                    abs(float(s.get("latitude", s.get("lat", 0))) - lat) +
                    abs(float(s.get("longitude", s.get("lon", s.get("lng", 0)))) - lon)
                )
            )
    except Exception as e:
        log.warning(f"WARN: wmip station search failed near ({lat}, {lon}): {e}")
    return None


def fetch_gauge_reading(station_id: str) -> dict | None:
    """
    Fetch the latest reading for a given WMIP station ID.
    Returns the raw API response dict/list, or None on failure.
    """
    try:
        # WMIP variable endpoint — try both known URL patterns
        for path in [
            f"{WMIP_BASE}/wini/monitoring/variable/{station_id}",
            f"{WMIP_BASE}/wini/monitoring/station/{station_id}/variable",
        ]:
            resp = requests.get(path, params={"f": "json"}, timeout=30)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        log.warning(f"WARN: wmip reading fetch failed for station {station_id}: {e}")
    return None


def extract_discharge(reading) -> float | None:
    """
    Extract the discharge/level value from a WMIP reading response.
    Field names vary across WMIP API versions — tries common patterns.
    """
    if reading is None:
        return None

    # If it's a list, use the first element
    if isinstance(reading, list):
        reading = reading[0] if reading else None
    if not isinstance(reading, dict):
        return None

    for field in ["value", "discharge", "streamflow", "level", "stage", "reading"]:
        val = reading.get(field)
        if val is not None:
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
    return None


def main():
    records = []
    today = date.today().isoformat()

    for name, lat, lon, radius in TARGET_GAUGES:
        try:
            station = find_station(lat, lon, radius)
            if not station:
                log.warning(f"WARN: wmip — no station found near {name} ({lat}, {lon})")
                continue

            # Station ID field varies across WMIP API versions
            station_id = (
                station.get("stationId")
                or station.get("station_id")
                or station.get("id")
                or station.get("properties", {}).get("stationId")
            )
            if not station_id:
                log.warning(f"WARN: wmip — could not extract station ID for {name}: {station}")
                continue

            station_lat = float(station.get("latitude", station.get("lat", lat)))
            station_lon = float(station.get("longitude", station.get("lon", station.get("lng", lon))))

            reading = fetch_gauge_reading(station_id)
            discharge = extract_discharge(reading)

            records.append({
                "source": "wmip",
                "forecast_date": today,
                "latitude": station_lat,
                "longitude": station_lon,
                "discharge_m3s": discharge,
                "scenario": "current",
            })
            log.info(f"OK: wmip — {name} (station {station_id}): discharge={discharge}")

        except Exception as e:
            log.warning(f"WARN: wmip — {name} failed: {e}")

    if records:
        # UNIQUE constraint: (source, forecast_date, latitude, longitude)
        # No location_hash column in flood_forecasts table.
        SUPABASE.table("flood_forecasts").upsert(
            records, on_conflict="source,forecast_date,latitude,longitude"
        ).execute()
        log.info(f"OK: wmip — {len(records)} gauge readings upserted")
    else:
        log.warning("WARN: wmip — no gauge readings upserted")


if __name__ == "__main__":
    main()
