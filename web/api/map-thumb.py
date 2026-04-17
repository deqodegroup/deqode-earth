"""
DEQODE EARTH — Sentinel-2 coastal change tile layer
Python serverless (Vercel).

Returns a GEE tile URL template for the erosion/accretion change layer.
The frontend loads tiles on demand via L.tileLayer — no full image render, no Pillow.
"""
from http.server import BaseHTTPRequestHandler
import ee
import json
import os
import base64
import sys
import traceback

LOCATIONS = {
    "niue":             {"bbox": [-169.9647, -19.155, -169.78, -18.955]},
    "palau":            {"bbox": [134.4, 7.0, 134.7, 7.4]},
    "fiji":             {"bbox": [177.2, -18.2, 178.0, -17.5]},
    "tuvalu":           {"bbox": [179.0, -8.7, 179.3, -8.4]},
    "kiribati":         {"bbox": [172.9, 1.3, 173.1, 1.5]},
    "marshall-islands": {"bbox": [171.0, 7.0, 171.4, 7.2]},
    "vanuatu":          {"bbox": [168.1, -17.8, 168.5, -17.5]},
    "solomon-islands":  {"bbox": [159.9, -9.5, 160.2, -9.3]},
}

BASELINE_START = "2019-01-01"
BASELINE_END   = "2019-12-31"
CURRENT_START  = "2024-01-01"
CURRENT_END    = "2024-12-31"

_initialised = False


def init_gee():
    global _initialised
    if _initialised:
        return
    b64 = os.environ.get("GEE_B64_KEY", "")
    if not b64:
        raise RuntimeError("GEE_B64_KEY env var not set")
    key = json.loads(base64.b64decode(b64))
    credentials = ee.ServiceAccountCredentials(key["client_email"], key_data=json.dumps(key))
    ee.Initialize(credentials, project="deqode-earth")
    _initialised = True


def generate_tile_url(slug: str):
    """Returns (tile_url: str, bounds: list)"""
    loc = LOCATIONS.get(slug)
    if not loc:
        raise ValueError(f"Unknown slug: {slug}")

    bbox = loc["bbox"]
    aoi = ee.Geometry.Rectangle(bbox)

    def ndwi_composite(start, end):
        return (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi)
            .filterDate(start, end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
            .select(["B3", "B8"])
            .median()
            .normalizedDifference(["B3", "B8"])
            .rename("ndwi"))

    baseline = ndwi_composite(BASELINE_START, BASELINE_END)
    current  = ndwi_composite(CURRENT_START,  CURRENT_END)

    # 0.1 threshold removes ambiguous mixed/shoreline pixels
    water_b = baseline.gt(0.1)
    water_c = current.gt(0.1)

    erosion_mask = water_b.eq(0).And(water_c.eq(1))
    accrtn_mask  = water_b.eq(1).And(water_c.eq(0))

    # Neighbourhood filter — drop isolated speckle (require ≥2 agreeing neighbours)
    kernel = ee.Kernel.square(radius=1)
    erosion_mask = (erosion_mask
        .reduceNeighborhood(reducer=ee.Reducer.sum(), kernel=kernel)
        .gte(2))
    accrtn_mask  = (accrtn_mask
        .reduceNeighborhood(reducer=ee.Reducer.sum(), kernel=kernel)
        .gte(2))

    # Classify: 1 = erosion (#E05B4B coral), 2 = accretion (#4CB9C0 teal)
    # selfMask() makes non-change pixels fully transparent
    classified = (erosion_mask.multiply(1)
                  .add(accrtn_mask.multiply(2))
                  .selfMask())

    map_id = classified.getMapId({
        "min": 1,
        "max": 2,
        "palette": ["E05B4B", "4CB9C0"],
        "opacity": 0.85,
    })

    tile_url = map_id["tile_fetcher"].url_format

    return tile_url, bbox


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self._send(200, {})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length)) if length else {}
            slug   = body.get("slug", "")
            if not slug:
                self._send(400, {"error": "slug is required"})
                return

            init_gee()
            tile_url, bounds = generate_tile_url(slug)
            self._send(200, {"tileUrl": tile_url, "bounds": bounds})

        except ValueError as e:
            self._send(400, {"error": str(e)})
        except Exception as e:
            tb = traceback.format_exc()
            print(tb, file=sys.stderr)
            self._send(500, {"error": str(e), "traceback": tb})

    def _send(self, code: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
