"""
JRC GloFAS Flood Hazard Maps v2.1 via GEE -> Supabase analysis_cache
Extracts max inundation depth at 100yr and 500yr return periods for Brisbane bbox.
Uses existing GEE service account (GEE_B64_KEY env var, base64-encoded JSON).

GEE ImageCollection: JRC/CEMS_GLOFAS/FloodHazard/v2_1
Bands: RP10_depth, RP20_depth, RP50_depth, RP100_depth, RP200_depth, RP500_depth

Results stored in analysis_cache as:
  analysis_type = 'flood_depth'
  region_slug = 'brisbane'
  params_hash = sha256(region_slug + ':flood_depth:' + return_period)[:32]
  result = {"depth_m": N, "return_period": 100, "source": "jrc_glofas", "bbox": [...]}

Paid upgrade option:
  GloFAS EWDS historical reanalysis (free, registration at ewds.climate.copernicus.eu)
  - Adds 1979-present daily discharge reanalysis for return period calibration
  - pip install cdsapi, configure ~/.cdsapirc with GLOFAS_API_KEY
  - Recommended: register and integrate as bonus data layer in Phase 3 or 4

DEA WOfS STAC (free, no auth):
  - collections=["wofs_ls_summary_alltime"] via pystac-client on public AWS S3
  - Adds 35yr flood frequency heatmap at 25m for Brisbane
  - No auth, no cost -- include in Phase 4 if time permits
"""
import os
import sys
import logging
import json
import base64
import hashlib
import tempfile
from supabase import create_client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

# Brisbane bbox (from lib/regions.ts)
BRISBANE_BBOX = [152.6, -27.8, 153.5, -27.2]
# Inner bbox for GEE (slightly smaller to avoid edge artifacts)
GEE_BBOX = [152.7, -27.7, 153.5, -27.1]

RETURN_PERIODS = [100, 500]


def make_params_hash(region_slug: str, return_period: int) -> str:
    raw = f"{region_slug}:flood_depth:rp{return_period}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def init_gee():
    """Initialize GEE from base64-encoded service account key."""
    import ee
    b64_key = os.environ.get("GEE_B64_KEY", "")
    if not b64_key:
        raise RuntimeError("GEE_B64_KEY env var not set")
    key_json = json.loads(base64.b64decode(b64_key).decode())
    service_account = key_json.get("client_email")
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(key_json, f)
        key_file = f.name
    credentials = ee.ServiceAccountCredentials(service_account, key_file)
    ee.Initialize(credentials)
    return ee


def fetch_glofas_depth(ee, return_period: int) -> float | None:
    """Extract max GloFAS flood depth for Brisbane bbox at given return period."""
    try:
        dataset = ee.ImageCollection("JRC/CEMS_GLOFAS/FloodHazard/v2_1")
        band_name = f"RP{return_period}_depth"
        image = dataset.select(band_name).mosaic()
        brisbane = ee.Geometry.Rectangle(GEE_BBOX)
        stats = image.reduceRegion(
            reducer=ee.Reducer.max(),
            geometry=brisbane,
            scale=90,
            maxPixels=1e7,
        )
        val = stats.getInfo()
        depth = val.get(band_name)
        return float(depth) if depth is not None else None
    except Exception as e:
        log.warning(f"WARN: jrc_glofas GEE reduce failed for RP{return_period}: {e}")
        return None


def main():
    if not os.environ.get("GEE_B64_KEY"):
        log.warning(
            "SKIP: jrc_glofas -- GEE_B64_KEY is not configured; "
            "the static hazard dataset was not refreshed"
        )
        return

    try:
        ee = init_gee()
    except Exception as e:
        log.warning(f"WARN: jrc_glofas GEE init failed: {e}")
        sys.exit(1)

    records = []
    for rp in RETURN_PERIODS:
        depth = fetch_glofas_depth(ee, rp)
        params_hash = make_params_hash("brisbane", rp)

        if depth is not None:
            records.append({
                "region_slug": "brisbane",
                "country_code": "AU",
                "analysis_type": "flood_depth",
                "params_hash": params_hash,
                "status": "complete",
                "result": json.dumps({
                    "depth_m": round(depth, 3),
                    "return_period": rp,
                    "source": "jrc_glofas",
                    "bbox": GEE_BBOX,
                }),
            })
            log.info(f"OK: jrc_glofas -- RP{rp}: max_depth={depth:.3f}m")
        else:
            records.append({
                "region_slug": "brisbane",
                "country_code": "AU",
                "analysis_type": "flood_depth",
                "params_hash": params_hash,
                "status": "failed",
                "error": f"No depth data returned for RP{rp}",
            })
            log.warning(f"WARN: jrc_glofas -- RP{rp}: no depth data")

    if records:
        # on_conflict matches UNIQUE(region_slug, analysis_type, params_hash) in schema
        SUPABASE.table("analysis_cache").upsert(
            records,
            on_conflict="region_slug,analysis_type,params_hash",
        ).execute()
        log.info(f"OK: jrc_glofas -- {len(records)} cache entries upserted")


if __name__ == "__main__":
    main()
