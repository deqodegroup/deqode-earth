"""
DEQODE EARTH — Coastal analysis via Sentinel-2 NDWI
Python serverless function (Vercel) — uses GEE Python SDK (gRPC, fast)
Same algorithm proven at ~10s locally. Replaces broken Node.js SDK route.
"""
from http.server import BaseHTTPRequestHandler
import ee
import json
import os
import base64
import math

# ── Locations (mirrors locations.ts) ─────────────────────────────────────────
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

# ── Analysis params ───────────────────────────────────────────────────────────
BASELINE_START = "2019-01-01"
BASELINE_END   = "2019-12-31"   # ~80 cloud-free Sentinel-2 scenes over Niue
CURRENT_START  = "2024-01-01"
CURRENT_END    = "2024-12-31"   # ~85 cloud-free scenes — last full year
SCALE          = 30             # metres — fast, accurate for island-scale change

# ── GEE init (cached across warm invocations) ─────────────────────────────────
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

# ── Analysis ──────────────────────────────────────────────────────────────────
def run_analysis(slug: str) -> dict:
    loc = LOCATIONS.get(slug)
    if not loc:
        raise ValueError(f"Unknown slug: {slug}")
    if not loc["live"]:
        raise ValueError(f"{slug} is not yet live")

    bbox = loc["bbox"]
    aoi  = ee.Geometry.Rectangle(bbox)

    def ndwi_composite(start, end):
        # Median raw bands first, THEN compute NDWI — fast (single operation on composite)
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

    water_b = baseline.gt(0)   # NDWI > 0 = water
    water_c = current.gt(0)

    # Land→water = erosion | water→land = accretion | land→land = stable
    result = (
        water_b.eq(0).And(water_c.eq(1)).rename("erosion")
        .addBands(water_b.eq(1).And(water_c.eq(0)).rename("accretion"))
        .addBands(water_b.eq(0).And(water_c.eq(0)).rename("stable"))
        .reduceRegion(ee.Reducer.sum(), aoi, SCALE, maxPixels=int(1e9))
        .getInfo()
    )

    px           = SCALE * SCALE
    erosion_m2   = result["erosion"]   * px
    accretion_m2 = result["accretion"] * px
    stable_m2    = result["stable"]    * px
    total_m2     = erosion_m2 + accretion_m2 + stable_m2

    lon_min, lat_min, lon_max, lat_max = bbox
    coast_len    = math.sqrt((lon_max - lon_min) ** 2 + (lat_max - lat_min) ** 2) * 111_000
    erosion_m    = erosion_m2   / max(coast_len, 1)
    accretion_m  = accretion_m2 / max(coast_len, 1)
    net_change_m = accretion_m  - erosion_m
    stable_pct   = (stable_m2 / total_m2 * 100) if total_m2 > 0 else 0

    return {
        "erosion_m":    round(erosion_m    * 10) / 10,
        "accretion_m":  round(accretion_m  * 10) / 10,
        "net_change_m": round(net_change_m * 10) / 10,
        "stable_pct":   round(stable_pct   * 10) / 10,
        "erosion_m2":   round(erosion_m2),
        "accretion_m2": round(accretion_m2),
        "period_start": "2019",
        "period_end":   "2024",
        "mapImageUrl":  "",
    }

# ── HTTP handler ──────────────────────────────────────────────────────────────
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
            metrics = run_analysis(slug)
            self._send(200, metrics)

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
        pass  # suppress default access logs
