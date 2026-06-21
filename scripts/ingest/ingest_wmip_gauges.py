"""
QLD WMIP current gauge readings -> Supabase flood_forecasts.

Default behaviour is product-first: find the nearest current public station,
write the latest discharge if available, and keep the job useful even when a
station only has level data or no fresh trace. Historical gauge pulls are a
separate research/reporting path.
"""

import json
import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote

import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

WMIP_SERVICE_URL = "https://water-monitoring.information.qld.gov.au/cgi/webservice.exe"
WMIP_SITE_FIELDS = ["STATION", "STNAME", "STNTYPE", "LATITUDE", "LONGITUDE", "LLDATUM"]
WMIP_DATASOURCES = ["P", "A", "G", "R"]
WMIP_DISCHARGE_VARIABLES = ["140", "135"]
WMIP_LEVEL_VARIABLES = ["100", "103"]
FRESHNESS_WINDOW_HOURS = 72

# Target gauge locations: (display_name, lat, lon, search_radius_km)
TARGET_GAUGES = [
    ("Brisbane River at City", -27.47, 153.02, 5.0),
    ("Lockyer Creek at Grantham", -27.47, 152.33, 10.0),
]


def wmip_query(function: str, version: str, params: dict) -> dict:
    payload = {"function": function, "version": version, "params": params}
    url = f"{WMIP_SERVICE_URL}?{quote(json.dumps(payload, separators=(',', ':')))}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_db_info(table_name: str, params: dict | None = None) -> list[dict]:
    data = wmip_query(
        "get_db_info",
        "3",
        {"table_name": table_name, "return_type": "array", **(params or {})},
    )
    if data.get("error_num") != 0:
        raise ValueError(data.get("error_msg", f"WMIP {table_name} lookup failed"))
    return data.get("return", {}).get("rows", [])


def open_stations() -> list[dict]:
    return get_db_info(
        "SITE",
        {
            "sitelist_filter": "GROUP(OPEN_STATIONS)",
            "field_list": WMIP_SITE_FIELDS,
        },
    )


def station_id(station: dict) -> str | None:
    return station.get("station") or station.get("STATION")


def station_lat(station: dict, fallback: float = 0) -> float:
    return float(station.get("latitude", station.get("LATITUDE", fallback)))


def station_lon(station: dict, fallback: float = 0) -> float:
    return float(station.get("longitude", station.get("LONGITUDE", fallback)))


def find_station(lat: float, lon: float, radius_km: float) -> dict | None:
    delta = radius_km / 111.0
    try:
        candidates = [
            station
            for station in open_stations()
            if abs(station_lat(station) - lat) <= delta
            and abs(station_lon(station) - lon) <= delta
        ]
        if candidates:
            return min(
                candidates,
                key=lambda s: abs(station_lat(s) - lat) + abs(station_lon(s) - lon),
            )
    except Exception as e:
        log.warning(f"WARN: wmip station search failed near ({lat}, {lon}): {e}")
    return None


def wmip_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y%m%d%H%M%S")


def trace_rows(data: dict) -> list:
    if data.get("error_num") != 0:
        return []
    returned = data.get("return", {})
    if isinstance(returned, dict):
        return returned.get("rows", []) or returned.get("traces", []) or []
    return returned if isinstance(returned, list) else []


def latest_numeric_value(rows: list) -> float | None:
    values = []
    for row in rows:
        if isinstance(row, dict):
            for field in ["value", "val", "mean", "data_value", "quality_value"]:
                if row.get(field) is not None:
                    try:
                        values.append(float(row[field]))
                        break
                    except (TypeError, ValueError):
                        pass
        elif isinstance(row, list):
            for item in reversed(row):
                try:
                    values.append(float(item))
                    break
                except (TypeError, ValueError):
                    pass
    return values[-1] if values else None


def fetch_trace_value(station: str, variables: list[str]) -> float | None:
    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=FRESHNESS_WINDOW_HOURS)

    for datasource in WMIP_DATASOURCES:
        for variable in variables:
            for data_type in ["mean", "point"]:
                try:
                    data = wmip_query(
                        "get_ts_traces",
                        "2",
                        {
                            "site_list": station,
                            "datasource": datasource,
                            "start_time": wmip_timestamp(start),
                            "end_time": wmip_timestamp(end),
                            "data_type": data_type,
                            "varfrom": variable,
                            "varto": variable,
                            "interval": "hour",
                            "multiplier": "1",
                        },
                    )
                    value = latest_numeric_value(trace_rows(data))
                    if value is not None:
                        return value
                except Exception:
                    continue
    return None


def fetch_gauge_reading(station: str) -> dict:
    return {
        "discharge": fetch_trace_value(station, WMIP_DISCHARGE_VARIABLES),
        "level": fetch_trace_value(station, WMIP_LEVEL_VARIABLES),
    }


def main():
    records = []
    today = date.today().isoformat()

    for name, lat, lon, radius in TARGET_GAUGES:
        try:
            station = find_station(lat, lon, radius)
            if not station:
                log.warning(f"WARN: wmip -- no station found near {name} ({lat}, {lon})")
                continue

            found_station_id = station_id(station)
            if not found_station_id:
                log.warning(f"WARN: wmip -- could not extract station ID for {name}: {station}")
                continue

            reading = fetch_gauge_reading(found_station_id)
            records.append(
                {
                    "source": "wmip",
                    "forecast_date": today,
                    "latitude": station_lat(station, lat),
                    "longitude": station_lon(station, lon),
                    "discharge_m3s": reading["discharge"],
                    "scenario": "current",
                }
            )

            if reading["discharge"] is None and reading["level"] is None:
                log.warning(f"WARN: wmip -- {name} ({found_station_id}) has no fresh trace")
            else:
                log.info(
                    f"OK: wmip -- {name} ({found_station_id}): "
                    f"discharge={reading['discharge']}, level={reading['level']}"
                )

        except Exception as e:
            log.warning(f"WARN: wmip -- {name} failed: {e}")

    if records:
        supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
        supabase.table("flood_forecasts").upsert(
            records, on_conflict="source,forecast_date,latitude,longitude"
        ).execute()
        log.info(f"OK: wmip -- {len(records)} gauge station records upserted")
    else:
        log.error("FAIL: wmip -- no gauge stations upserted")
        sys.exit(1)


if __name__ == "__main__":
    main()
