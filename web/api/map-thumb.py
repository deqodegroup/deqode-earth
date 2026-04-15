"""
DEQODE EARTH — Sentinel-2 coastal change map thumbnail
Python serverless (Vercel).

Base layer: true-color Sentinel-2 RGB (B4/B3/B2) — photorealistic satellite view.
Overlays:   erosion (coral #E05B4B) and accretion (teal #4CB9C0) from NDWI change.
Method:     sampleRectangle().getInfo() — same gRPC path as analyse.py, no permission issues.
"""
from http.server import BaseHTTPRequestHandler
import ee
import json
import os
import base64
import sys
import traceback
import io

from PIL import Image

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

# 400px raw sample — keeps all bboxes under sampleRectangle ~262k pixel limit.
# Fiji (largest): 400x350 = 140,000px.
RAW_W = 400
OUT_W = 800

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

    lon_range = lon_max - lon_min
    lat_range = lat_max - lat_min
    scale_m = max(30, (lon_range / RAW_W) * 111320)

    # --- True-colour base (B4=Red, B3=Green, B2=Blue) ---
    # This is the photorealistic "from orbit" satellite view.
    true_color = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(CURRENT_START, CURRENT_END)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
        .select(["B4", "B3", "B2"])
        .median()
        .visualize(**{"min": 200, "max": 3000, "gamma": 1.4}))

    # --- NDWI change detection ---
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

    # 0.1 threshold — removes ambiguous mixed/shore pixels that cause speckle
    water_b      = baseline.gt(0.1)
    water_c      = current.gt(0.1)
    erosion_mask = water_b.eq(0).And(water_c.eq(1))
    accrtn_mask  = water_b.eq(1).And(water_c.eq(0))

    # Neighbourhood filter — drop isolated single pixels (speckle)
    kernel = ee.Kernel.square(radius=1)
    erosion_mask = (erosion_mask
        .reduceNeighborhood(reducer=ee.Reducer.sum(), kernel=kernel)
        .gte(2).selfMask())
    accrtn_mask = (accrtn_mask
        .reduceNeighborhood(reducer=ee.Reducer.sum(), kernel=kernel)
        .gte(2).selfMask())

    erosion_viz = erosion_mask.visualize(**{"palette": ["#E05B4B"]})
    accrtn_viz  = accrtn_mask.visualize(**{"palette": ["#4CB9C0"]})

    # Mosaic: real satellite image as base, change overlays on top
    mosaic = ee.ImageCollection([true_color, erosion_viz, accrtn_viz]).mosaic()

    # Reproject to target resolution, then sample pixels via gRPC
    mosaic_proj = mosaic.reproject(crs="EPSG:4326", scale=scale_m)
    rect = mosaic_proj.sampleRectangle(region=aoi, defaultValue=0).getInfo()
    props = rect["properties"]

    r_rows = props["vis-red"]
    g_rows = props["vis-green"]
    b_rows = props["vis-blue"]

    h = len(r_rows)
    w = len(r_rows[0]) if h > 0 else 1

    r_flat = bytes([min(255, max(0, int(v))) for row in r_rows for v in row])
    g_flat = bytes([min(255, max(0, int(v))) for row in g_rows for v in row])
    b_flat = bytes([min(255, max(0, int(v))) for row in b_rows for v in row])

    rgb = bytearray(w * h * 3)
    rgb[0::3] = r_flat
    rgb[1::3] = g_flat
    rgb[2::3] = b_flat

    img = Image.frombytes("RGB", (w, h), bytes(rgb))

    new_h = max(1, round(h * OUT_W / w))
    img = img.resize((OUT_W, new_h), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_img = base64.b64encode(buf.getvalue()).decode()
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
