"""
QLD Flood Extent 2011 (Grantham / Lockyer Valley) -> Supabase flood_zones

Source: QLD Government Open Data - Flood extent series
Dataset: https://www.data.qld.gov.au/dataset/flood-extent-series

Queries the live ArcGIS layer for January 2011 Queensland flood extents,
filters to the Lockyer Valley / Grantham bounding box, and upserts one merged
polygon record into flood_zones.

UNIQUE constraint: (source, flood_class, council)
"""

import logging
import os
import sys

import geopandas as gpd
from shapely.geometry import MultiPolygon, box
from shapely.ops import unary_union
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

# QLD ArcGIS layer: "2011 Floodline Queensland towns - January".
# Geometry is the Grantham / Lockyer Valley bbox projected to Web Mercator.
QLD_2011_GEOJSON_URL = (
    "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/"
    "InlandWaters/FloodLines/MapServer/14/query"
    "?where=1%3D1"
    "&outFields=*"
    "&geometry=16920562.598%2C-3223781.685%2C16976222.344%2C-3161003.042"
    "&geometryType=esriGeometryEnvelope"
    "&inSR=3857"
    "&spatialRel=esriSpatialRelIntersects"
    "&outSR=4326"
    "&f=geojson"
)

GRANTHAM_BBOX = {
    "minx": 152.0,
    "maxx": 152.5,
    "miny": -27.8,
    "maxy": -27.3,
}


def filter_to_grantham(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    grantham_bounds = box(
        GRANTHAM_BBOX["minx"],
        GRANTHAM_BBOX["miny"],
        GRANTHAM_BBOX["maxx"],
        GRANTHAM_BBOX["maxy"],
    )
    intersecting = gdf[gdf.geometry.intersects(grantham_bounds)].copy()
    intersecting.geometry = intersecting.geometry.intersection(grantham_bounds)
    return intersecting[~intersecting.geometry.is_empty].copy()


def ensure_multipolygon(geom):
    if geom is None or geom.is_empty:
        return None
    if geom.geom_type == "Polygon":
        return MultiPolygon([geom])
    if geom.geom_type == "MultiPolygon":
        return geom
    return None


def main():
    try:
        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
        log.info("Fetching QLD 2011 flood extent GeoJSON from ArcGIS service")
        gdf = gpd.read_file(QLD_2011_GEOJSON_URL)
        log.info("GeoJSON loaded: %s features, CRS=%s", len(gdf), gdf.crs)

        if gdf.crs and gdf.crs.to_epsg() != 4326:
            log.info("Reprojecting from EPSG:%s to EPSG:4326", gdf.crs.to_epsg())
            gdf = gdf.to_crs(epsg=4326)

        grantham_gdf = filter_to_grantham(gdf)
        log.info("Filtered to Grantham bbox: %s features", len(grantham_gdf))

        if grantham_gdf.empty:
            log.warning("WARN: qld_2011 - no Grantham polygons found in ArcGIS layer")
            return

        geometries = [
            geom
            for geom in (ensure_multipolygon(row.geometry) for _, row in grantham_gdf.iterrows())
            if geom is not None
        ]
        if not geometries:
            log.warning("WARN: qld_2011 - no valid records to upsert")
            return

        merged_geom = ensure_multipolygon(unary_union(geometries))
        records = [
            {
                "source": "qld_2011",
                "flood_class": "high",
                "council": "Lockyer Valley Regional Council",
                "country_code": "AU",
                "region_slug": "grantham",
                "geometry": f"SRID=4326;{merged_geom.wkt}",
                "data_date": "2011-01-10",
            }
        ]

        supabase.table("flood_zones").upsert(
            records,
            on_conflict="source,flood_class,council",
        ).execute()
        log.info("OK: qld_2011 - %s records upserted", len(records))

    except Exception as e:
        log.warning("WARN: qld_2011 failed: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
