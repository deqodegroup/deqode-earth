"""
NOAA Coral Reef Watch CoralTemp (ERDDAP) -> Supabase ocean_metrics
Daily 5km sea surface temperature, 1985-present. No auth required.

Source: https://oceanwatch.pifsc.noaa.gov/erddap/griddap/CRW_sst_v3_1.html
Variable: analysed_sst (degree_C). Longitude convention is 0-360, not -180/180.

Pulls the latest source-published reading near each live region. Historical
trend/backfill work is intentionally separate and only run on request.
"""
import os
import sys
import logging
from datetime import datetime, timedelta, timezone
from statistics import mean

import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

ERDDAP_URL = "https://oceanwatch.pifsc.noaa.gov/erddap/griddap/CRW_sst_v3_1.json"
ERDDAP_INFO_URL = "https://oceanwatch.pifsc.noaa.gov/erddap/info/CRW_sst_v3_1/index.json"

# lat, lon (standard -180/180) from web/lib/regions.ts centers. Grantham is
# inland and has no ocean reading.
REGIONS = {
    "niue":              (-19.05, -169.87),
    "tuvalu":             (-8.52, 179.20),
    "fiji":              (-17.85, 177.60),
    "vanuatu":            (-17.73, 168.32),
    "solomon-islands":    (-9.43, 160.03),
    "palau":               (7.20, 134.55),
    "kiribati":            (1.42, 172.98),
    "marshall-islands":    (7.10, 171.20),
    "brisbane":          (-27.47, 153.02),
}

FRESHNESS_WINDOW_DAYS = 3
SPATIAL_RADIUS_DEGREES = 0.25


def to_erddap_lon(lon: float) -> float:
    """ERDDAP longitude convention is 0-360, not -180/180."""
    return lon + 360 if lon < 0 else lon


def erddap_time(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def parse_erddap_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def latest_source_time() -> datetime:
    resp = requests.get(ERDDAP_INFO_URL, timeout=30)
    resp.raise_for_status()
    rows = resp.json().get("table", {}).get("rows", [])
    for row in rows:
        if row[:4] == ["attribute", "NC_GLOBAL", "time_coverage_end", "String"]:
            return parse_erddap_time(row[4])
    raise ValueError("NOAA CoralTemp metadata missing time_coverage_end")


def query_window(now: datetime, source_latest: datetime) -> tuple[datetime, datetime]:
    candidate_end = now.astimezone(timezone.utc).replace(
        hour=12, minute=0, second=0, microsecond=0
    )
    end = min(candidate_end, source_latest.astimezone(timezone.utc))
    start = end - timedelta(days=FRESHNESS_WINDOW_DAYS)
    return start, end


def latest_valid_record(slug: str, payload: dict) -> dict | None:
    rows = payload.get("table", {}).get("rows", [])
    columns = payload.get("table", {}).get("columnNames", [])
    if not rows or "analysed_sst" not in columns or "time" not in columns:
        return None

    time_idx = columns.index("time")
    value_idx = columns.index("analysed_sst")
    by_date: dict[str, list[float]] = {}
    for row in rows:
        value = row[value_idx]
        if value is None:
            continue
        recorded_date = row[time_idx][:10]
        by_date.setdefault(recorded_date, []).append(float(value))

    if not by_date:
        return None

    latest_date = sorted(by_date)[-1]
    return {
        "source": "noaa_coraltemp",
        "region_slug": slug,
        "metric_type": "sst",
        "recorded_date": latest_date,
        "value": round(mean(by_date[latest_date]), 3),
        "unit": "celsius",
    }


def fetch_region_sst(
    slug: str,
    lat: float,
    lon: float,
    start: datetime,
    end: datetime,
) -> dict | None:
    erddap_lon = to_erddap_lon(lon)
    min_lat = lat - SPATIAL_RADIUS_DEGREES
    max_lat = lat + SPATIAL_RADIUS_DEGREES
    min_lon = erddap_lon - SPATIAL_RADIUS_DEGREES
    max_lon = erddap_lon + SPATIAL_RADIUS_DEGREES

    query = (
        f"analysed_sst[({erddap_time(start)}):({erddap_time(end)})]"
        f"[({min_lat}):({max_lat})][({min_lon}):({max_lon})]"
    )
    url = f"{ERDDAP_URL}?{query}"

    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    payload = resp.json()

    return latest_valid_record(slug, payload)


def main():
    all_records = []
    failures = []
    source_latest = latest_source_time()
    start, end = query_window(datetime.now(timezone.utc), source_latest)
    log.info(f"INFO: ocean_sst -- source latest {erddap_time(source_latest)}")

    for slug, (lat, lon) in REGIONS.items():
        try:
            record = fetch_region_sst(slug, lat, lon, start, end)
            if record:
                all_records.append(record)
                log.info(f"OK: {slug} -- SST {record['value']} on {record['recorded_date']}")
            else:
                failures.append(slug)
                log.warning(f"WARN: {slug} -- empty SST response")
        except Exception as e:
            failures.append(slug)
            log.warning(f"WARN: {slug} -- SST fetch failed: {e}")

    if not all_records:
        log.error("FAIL: ocean_sst -- no records fetched for any region")
        sys.exit(1)

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    supabase.table("ocean_metrics").upsert(
        all_records,
        on_conflict="source,region_slug,metric_type,recorded_date",
    ).execute()
    log.info(f"OK: ocean_sst -- {len(all_records)} records upserted across {len(REGIONS) - len(failures)} regions")

    if failures:
        log.warning(f"WARN: ocean_sst -- {len(failures)} regions failed: {failures}")
        # Partial success is acceptable -- don't fail the whole job over one
        # region's transient ERDDAP error, but surface it in the logs.


if __name__ == "__main__":
    main()
