"""
NOAA Coral Reef Watch CoralTemp (ERDDAP) -> Supabase ocean_metrics
Daily 5km sea surface temperature, 1985-present. No auth required.

Source: https://oceanwatch.pifsc.noaa.gov/erddap/griddap/CRW_sst_v3_1.html
Variable: analysed_sst (degree_C). Longitude convention is 0-360, not -180/180.

Pulls the last 14 days for each live region's center point so the API can
report both a current reading and a short-term rising/falling/stable trend.
"""
import os
import sys
import logging
from datetime import datetime, timedelta, timezone

import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

ERDDAP_URL = "https://oceanwatch.pifsc.noaa.gov/erddap/griddap/CRW_sst_v3_1.json"

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

LOOKBACK_DAYS = 14


def to_erddap_lon(lon: float) -> float:
    """ERDDAP longitude convention is 0-360, not -180/180."""
    return lon + 360 if lon < 0 else lon


def fetch_region_sst(slug: str, lat: float, lon: float) -> list[dict]:
    end = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=LOOKBACK_DAYS)
    erddap_lon = to_erddap_lon(lon)

    query = (
        f"analysed_sst[({start.isoformat().replace('+00:00', 'Z')}):"
        f"({end.isoformat().replace('+00:00', 'Z')})]"
        f"[({lat}):({lat})][({erddap_lon}):({erddap_lon})]"
    )
    url = f"{ERDDAP_URL}?{query}"

    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    payload = resp.json()

    rows = payload.get("table", {}).get("rows", [])
    columns = payload.get("table", {}).get("columnNames", [])
    if not rows or "analysed_sst" not in columns or "time" not in columns:
        return []

    time_idx = columns.index("time")
    value_idx = columns.index("analysed_sst")

    records = []
    for row in rows:
        value = row[value_idx]
        if value is None:
            continue
        recorded_date = row[time_idx][:10]
        records.append({
            "source": "noaa_coraltemp",
            "region_slug": slug,
            "metric_type": "sst",
            "recorded_date": recorded_date,
            "value": round(float(value), 3),
            "unit": "celsius",
        })
    return records


def main():
    all_records = []
    failures = []

    for slug, (lat, lon) in REGIONS.items():
        try:
            records = fetch_region_sst(slug, lat, lon)
            if records:
                all_records.extend(records)
                log.info(f"OK: {slug} -- {len(records)} SST records")
            else:
                failures.append(slug)
                log.warning(f"WARN: {slug} -- empty SST response")
        except Exception as e:
            failures.append(slug)
            log.warning(f"WARN: {slug} -- SST fetch failed: {e}")

    if not all_records:
        log.error("FAIL: ocean_sst -- no records fetched for any region")
        sys.exit(1)

    SUPABASE.table("ocean_metrics").upsert(
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
