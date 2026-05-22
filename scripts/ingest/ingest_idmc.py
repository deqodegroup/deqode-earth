"""
IDMC GIDD API -> Supabase displacement_records
Fetches disaster displacement events for 10 Pacific countries.
API: https://helix-tools-api.idmcdb.org/external-api/gidd/disasters/?country={ISO3}
No auth required.

ISO3 -> ISO2 mapping for displacement_records.country_code (char(2)):
  FJI->FJ, VUT->VU, SLB->SB, PNG->PG, TON->TO, WSM->WS, MHL->MH, KIR->KI, TUV->TV, NIU->NU
"""
import os
import sys
import logging
import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

IDMC_BASE = "https://helix-tools-api.idmcdb.org/external-api/gidd/disasters/"

# (ISO3, ISO2, country_name)
PACIFIC_COUNTRIES = [
    ("FJI", "FJ", "Fiji"),
    ("VUT", "VU", "Vanuatu"),
    ("SLB", "SB", "Solomon Islands"),
    ("PNG", "PG", "Papua New Guinea"),
    ("TON", "TO", "Tonga"),
    ("WSM", "WS", "Samoa"),
    ("MHL", "MH", "Marshall Islands"),
    ("KIR", "KI", "Kiribati"),
    ("TUV", "TV", "Tuvalu"),
    ("NIU", "NU", "Niue"),
]

CAUSE_MAP = {
    "cyclone": "cyclone",
    "tropical cyclone": "cyclone",
    "storm": "cyclone",
    "flood": "flood",
    "flooding": "flood",
    "drought": "drought",
    "earthquake": "earthquake",
    "volcano": "volcano",
    "volcanic eruption": "volcano",
    "sea level rise": "sea_level_rise",
}


def normalize_cause(raw: str) -> str:
    if not raw:
        return "other"
    lower = raw.lower()
    for key, val in CAUSE_MAP.items():
        if key in lower:
            return val
    return lower[:50]


def fetch_country(iso3: str) -> list:
    resp = requests.get(IDMC_BASE, params={"country": iso3}, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    # Response may be dict with 'results' key or a list
    if isinstance(data, dict):
        return data.get("results", data.get("data", []))
    return data if isinstance(data, list) else []


def main():
    total = 0
    for iso3, iso2, country_name in PACIFIC_COUNTRIES:
        try:
            events = fetch_country(iso3)
            records = []
            seen = set()

            for evt in events:
                year = evt.get("year") or evt.get("displacement_year")
                displaced = evt.get("new_displacements") or evt.get("displaced_count") or 0
                cause_raw = evt.get("hazard_type") or evt.get("cause") or ""
                event_date_str = evt.get("date") or (f"{year}-01-01" if year else None)

                # Dedup key: (country_code, year, cause, data_type)
                dedup_key = (iso2, year, normalize_cause(cause_raw))
                if dedup_key in seen:
                    continue
                seen.add(dedup_key)

                records.append({
                    "source": "idmc",
                    "country_code": iso2,
                    "country_name": country_name,
                    "year": int(year) if year else None,
                    "event_date": event_date_str,
                    "cause": normalize_cause(cause_raw),
                    "displaced_count": int(displaced) if displaced else 0,
                    "data_type": "event",
                })

            if records:
                SUPABASE.table("displacement_records").upsert(records).execute()
                total += len(records)
                log.info(f"OK: idmc -- {country_name} ({iso2}): {len(records)} events upserted")
            else:
                log.info(f"OK: idmc -- {country_name} ({iso2}): no events found")

        except Exception as e:
            log.warning(f"WARN: idmc -- {country_name} ({iso3}) failed: {e}")

    log.info(f"OK: idmc total -- {total} records upserted")


if __name__ == "__main__":
    main()
