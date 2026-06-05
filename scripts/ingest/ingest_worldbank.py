"""
World Bank REST API -> Supabase displacement_records
Indicators:
  SM.POP.NETM  -- Net migration (5-year aggregate) 2000-2024
  SP.POP.TOTL  -- Total population 2000-2024
Economies: TV, KI, VU, SB, FJ, MH, TO, WS, NU, PG

pip install requests
"""
import os
import logging
import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

ECONOMIES = ["TV", "KI", "VU", "SB", "FJ", "MH", "TO", "WS", "NU", "PG"]
YEARS = list(range(2000, 2025))

ECONOMY_NAMES = {
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
}


def main():
    def fetch_indicator(indicator: str) -> dict[tuple[str, int], int]:
        values = {}
        for economy in ECONOMIES:
            url = (
                f"https://api.worldbank.org/v2/country/{economy}/indicator/{indicator}"
                "?date=2000:2024&format=json&per_page=1000"
            )
            try:
                resp = requests.get(url, timeout=30)
                resp.raise_for_status()
                payload = resp.json()
            except Exception as e:
                log.warning("WARN: worldbank fetch failed for %s %s: %s", economy, indicator, e)
                continue

            if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
                log.warning("WARN: worldbank returned no rows for %s %s", economy, indicator)
                continue

            for row in payload[1]:
                value = row.get("value")
                if value is None:
                    continue
                values[(economy, int(row["date"]))] = int(value)
        return values

    log.info("Fetching World Bank SM.POP.NETM (net migration)...")
    migration_values = fetch_indicator("SM.POP.NETM")
    log.info("Fetching World Bank SP.POP.TOTL (population)...")
    population_values = fetch_indicator("SP.POP.TOTL")

    records = []
    for economy in ECONOMIES:
        for year in YEARS:
            net_migration = migration_values.get((economy, year))
            population = population_values.get((economy, year))

            if net_migration is not None or population is not None:
                records.append({
                    "source": "worldbank",
                    "country_code": economy,
                    "country_name": ECONOMY_NAMES.get(economy, economy),
                    "year": year,
                    "net_migration": net_migration,
                    "population": population,
                    "data_type": "annual",
                })

    if records:
        SUPABASE.table("displacement_records").upsert(records).execute()
        log.info(f"OK: worldbank -- {len(records)} annual records upserted")
    else:
        log.warning("WARN: worldbank -- no records to upsert")


if __name__ == "__main__":
    main()
