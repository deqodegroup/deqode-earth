"""
DEQODE EARTH — Sentinel-2 coastal change map thumbnail
Python serverless (Vercel) — uses ee.data.computePixels (gRPC, same path as evaluate()).
getThumbURL uses REST /thumbnails API which returns 403 on non-commercial GEE projects.
computePixels uses the same gRPC compute endpoint as reduceRegion — no permission issues.
Returns base64 data URI in JSON so no /api/map-image proxy is needed.
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

def generate_thumb(slug: str) -> str:
    loc = LOCATIONS.get(slug)
    if not loc:
        raise ValueError(f"Unknown slug: {slug}")

    bbox = loc["bbox"]
    lon_min, lat_min, lon_max, lat_max = bbox
    aoi = ee.Geometry.Rectangle(bbox)

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

    # Single-pass change map — dark ocean base + stable land + erosion + accretion
    base_img    = ee.Image(0).visualize(**{"palette": ["#0D1B2A"]})
    stable_viz  = stable_mask.selfMask().visualize(**{"palette": ["#1e3a5f"]})
    erosion_viz = erosion_mask.selfMask().visualize(**{"palette": ["#E05B4B"]})
    accrtn_viz  = accrtn_mask.selfMask().visualize(**{"palette": ["#4CB9C0"]})

    mosaic = ee.ImageCollection([base_img, stable_viz, erosion_viz, accrtn_viz]).mosaic()

    # computePixels: gRPC compute path — same permissions as reduceRegion/evaluate()
    # Avoids /v1/projects/{proj}/thumbnails REST endpoint which returns 403 on non-commercial GEE
    lon_range = lon_max - lon_min
    lat_range = lat_max - lat_min
    W = 800
    H = max(1, round(W * lat_range / lon_range))

    pixel_bytes = ee.data.computePixels({
        "expression": ee.serializer.encode(mosaic, for_cloud_api=True),
        "fileFormat": "PNG",
        "grid": {
            "dimensions":      {"width": W, "height": H},
            "affineTransform": {
                "scaleX":     lon_range / W,
                "shearX":     0,
                "translateX": lon_min,
                "shearY":     0,
                "scaleY":     -(lat_range / H),
                "translateY": lat_max,
            },
            "crsCode": "EPSG:4326",
        }
    })

    b64_img = base64.b64encode(pixel_bytes).decode()
    return f"data:image/png;base64,{b64_img}"


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
            data_url = generate_thumb(slug)
            self._send(200, {"mapImageUrl": data_url})

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
