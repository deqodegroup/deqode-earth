"""
BCC Flood Awareness FeatureServer -> Supabase flood_zones

Sources:
  - Overall flood risk (high/med/low/very_low) from BCC ArcGIS FeatureServer
  - Feb 2022 historic Brisbane River and Creek flood extent

Target table: flood_zones
  UNIQUE(source, flood_class, council)
  region_slug = 'brisbane', country_code = 'AU', source = 'bcc'

Env vars required:
  SUPABASE_URL          -- Supabase project URL
  SUPABASE_SERVICE_KEY  -- Service role key (bypasses RLS for write)
"""

import os
import sys
import logging
import requests
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

SUPABASE = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

BCC_ENDPOINTS = [
    {
        "url": "https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_Flood_Risk_Overall/FeatureServer/0/query",
        "source": "bcc",
        "flood_class_field": "FLOOD_RISK",  # Primary field; fallback checked in ingest_endpoint
        "flood_class_fallbacks": ["FLOODRISK", "FloodRisk", "flood_risk", "RISK_LEVEL"],
    },
    {
        "url": "https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services/Flood_Awareness_Historic_Brisbane_River_and_Creek_Floods_Feb2022/FeatureServer/0/query",
        "source": "bcc",
        "flood_class_field": "FLOOD_TYPE",
        "flood_class_fallbacks": ["FloodType", "flood_type", "TYPE"],
    },
]

# Normalise raw BCC field values to canonical flood_class values
FLOOD_CLASS_MAP = {
    "HIGH": "high",
    "High": "high",
    "high": "high",
    "MEDIUM": "medium",
    "Medium": "medium",
    "medium": "medium",
    "LOW": "low",
    "Low": "low",
    "low": "low",
    "VERY LOW": "very_low",
    "Very Low": "very_low",
    "very_low": "very_low",
    "VERYLOW": "very_low",
    "VeryLow": "very_low",
    # Feb 2022 historic extent type values
    "RIVER": "high",
    "River": "high",
    "CREEK": "medium",
    "Creek": "medium",
    "OVERLAND FLOW": "low",
    "Overland Flow": "low",
}


def fetch_paginated(url: str, page_size: int = 1000) -> list:
    """Fetch all features from an ArcGIS FeatureServer using resultOffset pagination."""
    features = []
    offset = 0
    while True:
        params = {
            "where": "1=1",
            "outFields": "*",
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": page_size,
        }
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("features", [])
        features.extend(batch)
        log.info(f"  Fetched {len(batch)} features at offset {offset} (total: {len(features)})")
        if len(batch) < page_size:
            break
        offset += page_size
    return features


def resolve_flood_class_field(props: dict, primary_field: str, fallbacks: list) -> str:
    """Resolve which field name contains the flood class value."""
    if primary_field in props:
        return primary_field
    for f in fallbacks:
        if f in props:
            return f
    return primary_field  # Return primary even if missing — will produce None gracefully


def geojson_to_multipolygon_wkt(geometry: dict) -> str | None:
    """Convert a GeoJSON geometry dict to WKT MultiPolygon string for PostGIS insertion."""
    if geometry is None:
        return None
    gtype = geometry.get("type", "")
    coords = geometry.get("coordinates", [])

    if gtype == "Polygon":
        # Wrap single Polygon in MultiPolygon
        rings = ", ".join(
            "(" + ", ".join(f"{x} {y}" for x, y in ring) + ")"
            for ring in coords
        )
        return f"MULTIPOLYGON(({rings}))"

    elif gtype == "MultiPolygon":
        polys = []
        for poly in coords:
            rings = ", ".join(
                "(" + ", ".join(f"{x} {y}" for x, y in ring) + ")"
                for ring in poly
            )
            polys.append(f"({rings})")
        return f"MULTIPOLYGON({', '.join(polys)})"

    return None


def ingest_endpoint(endpoint: dict) -> int:
    """Fetch all features from one BCC endpoint and upsert to flood_zones."""
    log.info(f"Fetching: {endpoint['url']}")
    features = fetch_paginated(endpoint["url"])

    if not features:
        log.warning(f"WARN: bcc — no features returned from {endpoint['url']}")
        return 0

    records = []
    skipped = 0
    for feat in features:
        props = feat.get("properties") or {}
        geom = feat.get("geometry")
        wkt = geojson_to_multipolygon_wkt(geom)
        if not wkt:
            skipped += 1
            continue

        # Resolve flood_class field dynamically on first feature
        field_name = resolve_flood_class_field(props, endpoint["flood_class_field"], endpoint.get("flood_class_fallbacks", []))
        raw_class = props.get(field_name, "")
        flood_class = FLOOD_CLASS_MAP.get(str(raw_class).strip(), None)
        if flood_class is None and raw_class:
            flood_class = str(raw_class).lower().replace(" ", "_")

        # Council field — BCC data uses COUNCIL or COUNCIL_NAME
        council = (
            props.get("COUNCIL")
            or props.get("COUNCIL_NAME")
            or props.get("council")
            or "BCC"
        )

        records.append({
            "source": "bcc",
            "flood_class": flood_class,
            "council": council,
            "country_code": "AU",
            "region_slug": "brisbane",
            "geometry": f"SRID=4326;{wkt}",
        })

    if skipped:
        log.warning(f"WARN: bcc — skipped {skipped} features with null/unsupported geometry")

    if not records:
        log.warning(f"WARN: bcc — no valid records to upsert from {endpoint['url']}")
        return 0

    SUPABASE.table("flood_zones").upsert(records, on_conflict="source,flood_class,council").execute()
    return len(records)


def main():
    total = 0
    for ep in BCC_ENDPOINTS:
        try:
            n = ingest_endpoint(ep)
            log.info(f"OK: bcc — {n} records upserted from {ep['url'].split('/services/')[1].split('/FeatureServer')[0]}")
            total += n
        except Exception as e:
            log.warning(f"WARN: bcc failed for {ep['url']}: {e}")

    log.info(f"OK: bcc total — {total} records upserted")


if __name__ == "__main__":
    main()
