"""
BCC Flood Awareness FeatureServer -> Supabase flood_zones.

The ArcGIS layers contain hundreds of thousands of small polygons, while the
database stores one dissolved MultiPolygon per source, class, and council.
"""

import logging
import os
import sys
from collections import defaultdict
from collections.abc import Iterator

import requests
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, shape
from shapely.ops import unary_union
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

BCC_ENDPOINTS = [
    {
        "url": "https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_Flood_Risk_Overall/FeatureServer/0/query",
        "source": "bcc_overall",
        "flood_class_field": "FLOOD_RISK",
        "flood_class_fallbacks": ["FLOODRISK", "FloodRisk", "flood_risk", "RISK_LEVEL"],
    },
    {
        "url": "https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/Flood_Awareness_Historic_Brisbane_River_and_Creek_Floods_Feb2022/FeatureServer/0/query",
        "source": "bcc_feb_2022",
        "flood_class_field": "SOURCE_TYPE",
        "flood_class_fallbacks": ["FLOOD_TYPE", "FloodType", "flood_type", "TYPE"],
    },
]

FLOOD_CLASS_MAP = {
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "VERY LOW": "very_low",
    "VERYLOW": "very_low",
    "RIVER": "high",
    "CREEK": "medium",
    "OVERLAND FLOW": "low",
}

COUNCIL_FIELDS = ["COUNCIL", "COUNCIL_NAME", "council"]


def fetch_pages(url: str, out_fields: list[str], page_size: int = 1000) -> Iterator[list]:
    offset = 0
    total = 0
    while True:
        params = {
            "where": "1=1",
            "outFields": ",".join(dict.fromkeys(out_fields)),
            "outSR": 4326,
            "geometryPrecision": 5,
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": page_size,
        }
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
        batch = resp.json().get("features", [])
        total += len(batch)
        log.info("  Fetched %s features at offset %s (total: %s)", len(batch), offset, total)
        if batch:
            yield batch
        if len(batch) < page_size:
            break
        offset += page_size


def resolve_flood_class(props: dict, primary_field: str, fallbacks: list[str]) -> str | None:
    raw_class = props.get(primary_field)
    if raw_class in (None, ""):
        for field in fallbacks:
            raw_class = props.get(field)
            if raw_class not in (None, ""):
                break
    if raw_class in (None, ""):
        return None
    normalised = str(raw_class).strip().upper()
    return FLOOD_CLASS_MAP.get(normalised, normalised.lower().replace(" ", "_"))


def polygonal_geometry(geometry):
    if geometry is None or geometry.is_empty:
        return None
    if isinstance(geometry, Polygon):
        return MultiPolygon([geometry])
    if isinstance(geometry, MultiPolygon):
        return geometry
    if isinstance(geometry, GeometryCollection):
        polygons = [
            item
            for item in geometry.geoms
            if isinstance(item, (Polygon, MultiPolygon)) and not item.is_empty
        ]
        return polygonal_geometry(unary_union(polygons)) if polygons else None
    return None


def dissolve_endpoint(endpoint: dict) -> list[dict]:
    fields = [
        endpoint["flood_class_field"],
        *endpoint.get("flood_class_fallbacks", []),
        *COUNCIL_FIELDS,
    ]
    page_geometries = defaultdict(list)
    skipped = 0

    for batch in fetch_pages(endpoint["url"], fields):
        batch_groups = defaultdict(list)
        for feature in batch:
            props = feature.get("properties") or {}
            flood_class = resolve_flood_class(
                props,
                endpoint["flood_class_field"],
                endpoint.get("flood_class_fallbacks", []),
            )
            geometry_data = feature.get("geometry")
            if flood_class is None or geometry_data is None:
                skipped += 1
                continue

            try:
                geometry = polygonal_geometry(shape(geometry_data))
            except Exception:
                geometry = None
            if geometry is None:
                skipped += 1
                continue

            council = next(
                (str(props[field]) for field in COUNCIL_FIELDS if props.get(field)),
                "BCC",
            )
            batch_groups[(flood_class, council)].append(geometry)

        for key, geometries in batch_groups.items():
            page_geometries[key].append(unary_union(geometries))

    if skipped:
        log.warning(
            "WARN: %s -- skipped %s features with missing class or geometry",
            endpoint["source"],
            skipped,
        )

    records = []
    for (flood_class, council), geometries in page_geometries.items():
        dissolved = polygonal_geometry(unary_union(geometries))
        if dissolved is None:
            continue
        simplified = polygonal_geometry(dissolved.simplify(0.00001, preserve_topology=True))
        if simplified is None:
            continue
        records.append(
            {
                "source": endpoint["source"],
                "flood_class": flood_class,
                "council": council,
                "country_code": "AU",
                "region_slug": "brisbane",
                "geometry": f"SRID=4326;{simplified.wkt}",
            }
        )
    return records


def main():
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )
    failures = 0
    total = 0

    for endpoint in BCC_ENDPOINTS:
        try:
            log.info("Fetching: %s", endpoint["url"])
            records = dissolve_endpoint(endpoint)
            if not records:
                raise RuntimeError("no valid dissolved records produced")
            supabase.table("flood_zones").upsert(
                records,
                on_conflict="source,flood_class,council",
            ).execute()
            total += len(records)
            log.info(
                "OK: %s -- %s dissolved records upserted",
                endpoint["source"],
                len(records),
            )
        except Exception as exc:
            failures += 1
            log.warning("WARN: %s failed: %s", endpoint["source"], exc)

    log.info("OK: bcc total -- %s dissolved records upserted", total)
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
