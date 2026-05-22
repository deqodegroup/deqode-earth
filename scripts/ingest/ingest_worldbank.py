"""
World Bank wbgapi -> Supabase displacement_records
Indicators:
  SM.POP.NETM  -- Net migration (5-year aggregate) 2000-2024
  SP.POP.TOTL  -- Total population 2000-2024
Economies: TV, KI, VU, SB, FJ, MH, TO, WS, NU, PG

pip install wbgapi
"""
import os
import sys
import logging
import wbgapi as wb
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
    try:
        log.info("Fetching World Bank SM.POP.NETM (net migration)...")
        df_migration = wb.data.DataFrame("SM.POP.NETM", economy=ECONOMIES, time=YEARS)
        log.info("Fetching World Bank SP.POP.TOTL (population)...")
        df_population = wb.data.DataFrame("SP.POP.TOTL", economy=ECONOMIES, time=YEARS)
    except Exception as e:
        log.warning(f"WARN: worldbank fetch failed: {e}")
        sys.exit(1)

    records = []
    for economy in ECONOMIES:
        for year in YEARS:
            net_migration = None
            population = None
            try:
                # wbgapi DataFrame indexed by economy and year
                # Columns are years (YR2000 etc), rows are economies
                year_key = f"YR{year}"
                if economy in df_migration.index and year_key in df_migration.columns:
                    val = df_migration.loc[economy, year_key]
                    if val is not None and str(val) not in ("nan", "NaN", ""):
                        net_migration = int(val)
                if economy in df_population.index and year_key in df_population.columns:
                    val = df_population.loc[economy, year_key]
                    if val is not None and str(val) not in ("nan", "NaN", ""):
                        population = int(val)
            except (KeyError, ValueError):
                pass

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
