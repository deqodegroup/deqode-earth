"""
PDH.stat SDMX API -> Supabase displacement_records
Fetches population projections to 2050 for all Pacific territories.
URL: https://stats-nsi-stable.pacificdata.org/rest/data/SPC,DF_POP_PROJ/all/?format=csvfilewithlabels
"""
import os
import sys
import io
import logging
import csv
import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

PDH_URL = "https://stats-nsi-stable.pacificdata.org/rest/data/SPC,DF_POP_PROJ/all/?format=csvfilewithlabels"

# Map PDH.stat territory codes -> ISO2 where available
# PDH covers all 22 Pacific territories; we map those matching our regions
PDH_TO_ISO2 = {
    "TV": "TV",   # Tuvalu
    "KI": "KI",   # Kiribati
    "VU": "VU",   # Vanuatu
    "SB": "SB",   # Solomon Islands
    "FJ": "FJ",   # Fiji
    "MH": "MH",   # Marshall Islands
    "TO": "TO",   # Tonga
    "WS": "WS",   # Samoa
    "NU": "NU",   # Niue
    "PG": "PG",   # Papua New Guinea
    "PW": "PW",   # Palau
    "AS": "AS",   # American Samoa
    "GU": "GU",   # Guam
    "CK": "CK",   # Cook Islands
}

TERRITORY_NAMES = {
    "TV": "Tuvalu",
    "KI": "Kiribati",
    "VU": "Vanuatu",
    "SB": "Solomon Islands",
    "FJ": "Fiji",
    "MH": "Marshall Islands",
    "TO": "Tonga",
    "WS": "Samoa",
    "NU": "Niue",
    "PG": "Papua New Guinea",
    "PW": "Palau",
    "AS": "American Samoa",
    "GU": "Guam",
    "CK": "Cook Islands",
}


def main():
    try:
        log.info("Fetching PDH.stat population projections...")
        resp = requests.get(PDH_URL, timeout=120)
        resp.raise_for_status()
        content = resp.text
    except Exception as e:
        log.warning(f"WARN: pdh_stat fetch failed: {e}")
        sys.exit(1)

    records = []
    reader = csv.DictReader(io.StringIO(content))

    # CSV columns vary -- inspect headers and adapt
    # Typical columns: GEO_PICT (territory code), TIME_PERIOD (year), OBS_VALUE (population)
    for row in reader:
        territory = row.get("GEO_PICT", row.get("ECONOMY", row.get("geo_pict", "")))
        year_str = row.get("TIME_PERIOD", row.get("time_period", row.get("year", "")))
        value_str = row.get("OBS_VALUE", row.get("obs_value", row.get("value", "")))

        iso2 = PDH_TO_ISO2.get(territory)
        if not iso2:
            continue  # Skip territories not in our region set

        try:
            year = int(year_str) if year_str else None
            population = int(float(value_str)) if value_str else None
        except (ValueError, TypeError):
            continue

        if year and population:
            records.append({
                "source": "pdh_stat",
                "country_code": iso2,
                "country_name": TERRITORY_NAMES.get(iso2, iso2),
                "year": year,
                "population": population,
                "data_type": "projection",
            })

    if records:
        SUPABASE.table("displacement_records").upsert(records).execute()
        log.info(f"OK: pdh_stat -- {len(records)} projection records upserted")
    else:
        log.warning("WARN: pdh_stat -- no records parsed from CSV")


if __name__ == "__main__":
    main()
