"""
QLD Flood Extent 2011 (Grantham / Lockyer Valley) -> Supabase flood_zones

Source: QLD Government Open Data - Flood Extent Series
Dataset: https://www.data.qld.gov.au/dataset/flood-extent-series

Downloads the 2011 GPKG, filters to the Lockyer Valley / Grantham bounding box,
and upserts polygons into flood_zones with:
  source      = 'qld_2011'
  region_slug = 'grantham'
  country_code = 'AU'
  flood_class  = 'high'   (the 2011 event was a catastrophic flood)
  data_date    = '2011-01-10'  (peak inundation during 2010/11 QLD floods)

UNIQUE constraint: (source, flood_class, council)

Env vars required:
  SUPABASE_URL          -- Supabase project URL
  SUPABASE_SERVICE_KEY  -- Service role key (bypasses RLS for write)

Note: The exact GPKG download URL may need updating if QLD Data Portal restructures.
Check https://www.data.qld.gov.au/dataset/flood-extent-series for the current URL
and update QLD_2011_URL below before running if the download fails.
"""

import os
import sys
import logging
import tempfile
import requests
import geopandas as gpd
from shapely.geometry import MultiPolygon
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

# QLD Data Portal direct GPKG download URL for the 2011 flood extent.
# If this returns a redirect or 404, navigate to:
#   https://www.data.qld.gov.au/dataset/flood-extent-series
# and locate the 2011 GPKG resource to get the current URL.
QLD_2011_URL = (
    "https://www.data.qld.gov.au/dataset/flood-extent-series"
    "/resource/b6c3ab5f-7a32-4afc-b706-9a4f1f42e2f7"
    "/download/qld-flood-extent-2011.gpkg"
)

# Grantham / Lockyer Valley bounding box (WGS84)
# Grantham township: -27.47°N, 152.33°E
# Broad Lockyer Valley filter: lon 152.0–152.5, lat -27.8 to -27.3
GRANTHAM_BBOX = {
    "minx": 152.0,
    "maxx": 152.5,
    "miny": -27.8,
    "maxy": -27.3,
}


def download_gpkg(url: str) -> str:
    """Download GPKG to a temp file and return its path."""
    log.info(f"Downloading QLD 2011 flood extent GPKG from {url}")
    with tempfile.NamedTemporaryFile(suffix=".gpkg", delete=False) as tmp:
        resp = requests.get(url, timeout=120, stream=True)
        resp.raise_for_status()
        for chunk in resp.iter_content(chunk_size=8192):
            tmp.write(chunk)
        tmp_path = tmp.name
    log.info(f"Downloaded GPKG to {tmp_path}")
    return tmp_path


def filter_to_grantham(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Filter GeoDataFrame to the Grantham / Lockyer Valley bounding box."""
    bounds = gdf.geometry.bounds
    mask = (
        (bounds["minx"] >= GRANTHAM_BBOX["minx"]) &
        (bounds["maxx"] <= GRANTHAM_BBOX["maxx"]) &
        (bounds["miny"] >= GRANTHAM_BBOX["miny"]) &
        (bounds["maxy"] <= GRANTHAM_BBOX["maxy"])
    )
    return gdf[mask].copy()


def ensure_multipolygon(geom):
    """Wrap a Polygon in a MultiPolygon if needed; return MultiPolygon unchanged."""
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Polygon":
        return MultiPolygon([geom])
    if geom.geom_type == "MultiPolygon":
        return geom
    return None


def main():
    try:
        tmp_path = download_gpkg(QLD_2011_URL)
        gdf = gpd.read_file(tmp_path)
        log.info(f"GPKG loaded: {len(gdf)} features, CRS={gdf.crs}")

        # Reproject to WGS84 if needed
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            log.info(f"Reprojecting from EPSG:{gdf.crs.to_epsg()} to EPSG:4326")
            gdf = gdf.to_crs(epsg=4326)

        grantham_gdf = filter_to_grantham(gdf)
        log.info(f"Filtered to Grantham bbox: {len(grantham_gdf)} features")

        if grantham_gdf.empty:
            log.warning("WARN: qld_2011 — no Grantham polygons found in GPKG")
            return

        records = []
        skipped = 0
        for _, row in grantham_gdf.iterrows():
            geom = ensure_multipolygon(row.geometry)
            if geom is None:
                skipped += 1
                continue
            records.append({
                "source": "qld_2011",
                "flood_class": "high",
                "council": "Lockyer Valley Regional Council",
                "country_code": "AU",
                "region_slug": "grantham",
                "geometry": f"SRID=4326;{geom.wkt}",
                "data_date": "2011-01-10",
            })

        if skipped:
            log.warning(f"WARN: qld_2011 — skipped {skipped} null/empty geometries")

        if not records:
            log.warning("WARN: qld_2011 — no valid records to upsert")
            return

        SUPABASE.table("flood_zones").upsert(records, on_conflict="source,flood_class,council").execute()
        log.info(f"OK: qld_2011 — {len(records)} records upserted")

    except Exception as e:
        log.warning(f"WARN: qld_2011 failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
