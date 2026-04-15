"""
DEQODE EARTH — Sentinel-2 coastal change overlay
Python serverless (Vercel).

Returns a transparent RGBA PNG with ONLY erosion/accretion pixels coloured.
The satellite base layer is handled by Leaflet (Esri World Imagery tiles) on the frontend.

Method: sampleRectangle().getInfo() — same gRPC path as analyse.py, no permission issues.
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

# 400px raw sample width.
# Fiji (largest bbox, 0.8° x 0.7°) → 400x350 = 140k px — under the 262k limit.
RAW_W = 400
OUT_W = 800

# RGBA colours for change pixels
EROSION_RGBA   = (224, 91,  75,  220)  # #E05B4B
ACCRETION_RGBA = (76,  185, 192, 220)  # #4CB9C0

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


def generate_overlay(slug: str):
    """Returns (data_uri: str, bounds: list)"""
    loc = LOCATIONS.get(slug)
    if not loc:
        raise ValueError(f"Unknown slug: {slug}")

    bbox = loc["bbox"]
    lon_min, lat_min, lon_max, lat_max = bbox
    aoi = ee.Geometry.Rectangle(bbox)

    lon_range = lon_max - lon_min
    lat_range = lat_max - lat_min
    scale_m = max(30, (lon_range / RAW_W) * 111320)

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

    # Sample both binary bands in one call
    change_bands = (erosion_mask.rename("erosion")
                    .addBands(accrtn_mask.rename("accretion")))
    change_proj  = change_bands.reproject(crs="EPSG:4326", scale=scale_m)
    rect = change_proj.sampleRectangle(region=aoi, defaultValue=0).getInfo()
    props = rect["properties"]

    erosion_rows = props["erosion"]
    accrtn_rows  = props["accretion"]

    h = len(erosion_rows)
    w = len(erosion_rows[0]) if h > 0 else 1

    e_flat = [int(v) for row in erosion_rows for v in row]
    a_flat = [int(v) for row in accrtn_rows  for v in row]

    # Build RGBA: transparent background, coloured only where change detected
    rgba = bytearray(w * h * 4)  # all zeros = transparent
    for i, (e, a) in enumerate(zip(e_flat, a_flat)):
        idx = i * 4
        if e:
            rgba[idx], rgba[idx+1], rgba[idx+2], rgba[idx+3] = EROSION_RGBA
        elif a:
            rgba[idx], rgba[idx+1], rgba[idx+2], rgba[idx+3] = ACCRETION_RGBA

    img = Image.frombytes("RGBA", (w, h), bytes(rgba))

    # Upscale — NEAREST preserves crisp hard edges on sparse categorical overlay
    new_h = max(1, round(h * OUT_W / w))
    img = img.resize((OUT_W, new_h), Image.NEAREST)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_img = base64.b64encode(buf.getvalue()).decode()
    data_uri = f"data:image/png;base64,{b64_img}"

    return data_uri, bbox


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
            data_uri, bounds = generate_overlay(slug)
            self._send(200, {"mapImageUrl": data_uri, "bounds": bounds})

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
