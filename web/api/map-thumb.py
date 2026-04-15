"""
DEQODE EARTH — Sentinel-2 coastal change map thumbnail
Python serverless (Vercel) — gRPC fast path, same GEE_B64_KEY env var.
Returns a proxied /api/map-image URL so the frontend avoids CORS.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote
import ee
import json
import os
import base64

LOCATIONS = {
    "niue":             {"bbox": [-169.9647, -19.155, -169.78, -18.955], "live": True},
    "palau":            {"bbox": [134.4, 7.0, 134.7, 7.4],               "live": True},
    "fiji":             {"bbox": [177.2, -18.2, 178.0, -17.5],           "live": True},
    "tuvalu":           {"bbox": [179.0, -8.7, 179.3, -8.4],             "live": False},
    "kiribati":         {"bbox": [172.9, 1.3, 173.1, 1.5],               "live": False},
    "marshall-islands": {"bbox": [171.0, 7.0, 171.4, 7.2],               "live": False},
    "vanuatu":          {"bbox": [168.1, -17.8, 168.5, -17.5],           "live": False},
    "solomon-islands":  {"bbox": [159.9, -9.5, 160.2, -9.3],             "live": False},
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

def generate_thumb(slug: str) -> str:
    loc = LOCATIONS.get(slug)
    if not loc:
        raise ValueError(f"Unknown slug: {slug}")

    bbox = loc["bbox"]
    aoi  = ee.Geometry.Rectangle(bbox)

    def ndwi_composite(start, end):
        return (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi)
            .filterDate(start, end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .select(["B3", "B8"])
            .median()
            .normalizedDifference(["B3", "B8"])
            .rename("ndwi"))

    baseline = ndwi_composite(BASELINE_START, BASELINE_END)
    current  = ndwi_composite(CURRENT_START,  CURRENT_END)

    water_b      = baseline.gt(0)
    water_c      = current.gt(0)
    erosion_mask = water_b.eq(0).And(water_c.eq(1))
    accrtn_mask  = water_b.eq(1).And(water_c.eq(0))
    stable_mask  = water_b.eq(0).And(water_c.eq(0))

    # Single-pass change map: dark ocean base + erosion (coral) + accretion (teal) + stable land (grey)
    # Avoids a third ImageCollection scan — just NDWI composites already computed above
    base_img    = ee.Image(0).visualize(**{"palette": ["#0D1B2A"]})  # ocean dark
    stable_viz  = stable_mask.selfMask().visualize(**{"palette":  ["#1e3a5f"]})
    erosion_viz = erosion_mask.selfMask().visualize(**{"palette": ["#E05B4B"]})
    accrtn_viz  = accrtn_mask.selfMask().visualize(**{"palette":  ["#4CB9C0"]})

    mosaic = ee.ImageCollection([base_img, stable_viz, erosion_viz, accrtn_viz]).mosaic()

    raw_url = mosaic.getThumbURL({
        "region": aoi,
        "dimensions": 800,
        "format": "jpg",
    })

    return f"/api/map-image?url={quote(raw_url, safe='')}"


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
            map_image_url = generate_thumb(slug)
            self._send(200, {"mapImageUrl": map_image_url})

        except ValueError as e:
            self._send(400, {"error": str(e)})
        except Exception as e:
            self._send(500, {"error": str(e)})

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
