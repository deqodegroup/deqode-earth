"""
Deltares Global Flood Maps via Planetary Computer -> Supabase flood_forecasts
Fetches coastal inundation depth for 8 Pacific SIDS at multiple return periods.
No auth required -- Microsoft Planetary Computer signs URLs automatically.

Paid upgrade options (do not block on these):
  - Planet Labs (~$500/mo): daily 3m imagery for coastline change; far superior revisit times
  - Copernicus GFM (free registration): near-real-time SAR flood extent from Sentinel-1
  - Maxar SecureWatch (paid): highest-res archive imagery for SIDS premium tier
"""
import os
import sys
import logging
from datetime import date

import pystac_client
import planetary_computer
import xarray as xr
import numpy as np
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

# Pacific SIDS: (slug, iso2, center_lat, center_lon, bbox)
# Bboxes match lib/regions.ts exactly
SIDS_TARGETS = [
    ("niue",             "NU", -19.05,  -169.87, [-169.9647, -19.155, -169.78,  -18.955]),
    ("tuvalu",           "TV",  -8.52,   179.20,  [179.0,     -8.7,    179.3,    -8.4  ]),
    ("fiji",             "FJ", -17.85,   177.60,  [177.2,    -18.2,    178.0,   -17.5  ]),
    ("vanuatu",          "VU", -17.73,   168.32,  [168.1,    -17.8,    168.5,   -17.5  ]),
    ("solomon-islands",  "SB",  -9.43,   160.03,  [159.9,     -9.5,    160.2,    -9.3  ]),
    ("palau",            "PW",   7.20,   134.55,  [134.4,      7.0,    134.7,     7.4  ]),
    ("kiribati",         "KI",   1.42,   172.98,  [172.9,      1.3,    173.1,     1.5  ]),
    ("marshall-islands", "MH",   7.10,   171.20,  [171.0,      7.0,    171.4,     7.2  ]),
]

SCENARIOS = ["current", "2050_rcp45", "2050_rcp85"]
TODAY = date.today().isoformat()


def fetch_deltares_depth(bbox: list, scenario: str) -> float | None:
    """Fetch mean coastal inundation depth from Deltares for a bbox and scenario."""
    try:
        catalog = pystac_client.Client.open(
            "https://planetarycomputer.microsoft.com/api/stac/v1",
            modifier=planetary_computer.sign_inplace,
        )
        query_params = {
            "deltares:dem_name": {"eq": "MERITDEM"},
            "deltares:resolution": {"eq": "90"},
        }
        # Map scenario to Deltares collection filter if applicable
        search = catalog.search(
            collections=["deltares-floods"],
            bbox=bbox,
            query=query_params,
        )
        items = list(search.items())
        if not items:
            log.warning(f"Deltares: no items found for bbox={bbox}, scenario={scenario}")
            return None

        # Use first matching item, load inundation depth band
        item = items[0]
        # Asset name varies -- try common patterns
        asset_key = None
        for k in item.assets:
            if "inundation" in k.lower() or "depth" in k.lower() or "flood" in k.lower():
                asset_key = k
                break
        if not asset_key:
            asset_key = list(item.assets.keys())[0]

        href = item.assets[asset_key].href
        ds = xr.open_dataset(href, engine="rasterio")
        # Clip to bbox and compute mean non-zero depth
        lon_min, lat_min, lon_max, lat_max = bbox
        clipped = ds.sel(
            x=slice(lon_min, lon_max),
            y=slice(lat_max, lat_min),  # y is decreasing
        )
        data_var = list(clipped.data_vars)[0]
        arr = clipped[data_var].values.flatten()
        arr = arr[arr > 0]  # Exclude no-data (0 or negative)
        if len(arr) == 0:
            return None
        return float(np.mean(arr))

    except Exception as e:
        log.warning(f"WARN: deltares fetch failed for bbox={bbox}, scenario={scenario}: {e}")
        return None


def main():
    total = 0
    for slug, iso2, lat, lon, bbox in SIDS_TARGETS:
        records = []
        for scenario in SCENARIOS:
            depth = fetch_deltares_depth(bbox, scenario)
            if depth is not None:
                records.append({
                    "source": "deltares",
                    "forecast_date": TODAY,
                    "latitude": lat,
                    "longitude": lon,
                    "coastal_depth_m": round(depth, 3),
                    "scenario": scenario,
                    "return_period_years": None,  # Deltares returns multiple; use mean
                })
                log.info(f"OK: deltares -- {slug} ({scenario}): coastal_depth_m={depth:.3f}")

        if records:
            # on_conflict matches UNIQUE(source, forecast_date, latitude, longitude) in schema
            SUPABASE.table("flood_forecasts").upsert(
                records,
                on_conflict="source,forecast_date,latitude,longitude",
            ).execute()
            total += len(records)
        else:
            log.warning(f"WARN: deltares -- {slug}: no depth data retrieved")

    log.info(f"OK: deltares total -- {total} records upserted")


if __name__ == "__main__":
    main()
