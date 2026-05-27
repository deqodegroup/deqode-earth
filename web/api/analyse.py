"""
DEQODE EARTH — Coastal analysis via Sentinel-2 MNDWI + Otsu + connected-components
Python serverless function (Vercel) — uses GEE Python SDK (gRPC, fast)
Algorithm: MNDWI (B3 - B11) / (B3 + B11) + Otsu adaptive threshold
           + dry-season (May-Oct) median composite + 0.5 ha connected-components filter
           + SRTM SLR exposure (1m/2m/5m) + NASA NEX-GDDP-CMIP6 SSP585 temp delta
Match DEA Coastlines v3.0 and CoastSat methodology.
"""
from http.server import BaseHTTPRequestHandler
import ee
import json
import os
import base64
import math

# ── Locations (mirrors web/lib/regions.ts) ────────────────────────────────────
# `scale`: 10 for narrow atolls (bbox width < 0.1°), 30 otherwise
# `min_area_m2`: 1000 for narrow atolls (preserve thin coastline features), 5000 otherwise
LOCATIONS = {
    "niue":             {"bbox": [-169.9647, -19.155, -169.78, -18.955], "live": True,  "scale": 30, "min_area_m2": 5000},
    "palau":            {"bbox": [134.4, 7.0, 134.7, 7.4],               "live": True,  "scale": 30, "min_area_m2": 5000},
    "fiji":             {"bbox": [177.2, -18.2, 178.0, -17.5],           "live": True,  "scale": 30, "min_area_m2": 5000},
    "tuvalu":           {"bbox": [179.0, -8.7, 179.3, -8.4],             "live": False, "scale": 10, "min_area_m2": 1000},
    "kiribati":         {"bbox": [172.9, 1.3, 173.1, 1.5],               "live": False, "scale": 10, "min_area_m2": 1000},
    "marshall-islands": {"bbox": [171.0, 7.0, 171.4, 7.2],               "live": False, "scale": 10, "min_area_m2": 1000},
    "vanuatu":          {"bbox": [168.1, -17.8, 168.5, -17.5],           "live": False, "scale": 30, "min_area_m2": 5000},
    "solomon-islands":  {"bbox": [159.9, -9.5, 160.2, -9.3],             "live": False, "scale": 30, "min_area_m2": 5000},
}

BASELINE_YEAR = 2019
CURRENT_YEAR  = 2024

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

# ── Algorithm helpers ─────────────────────────────────────────────────────────

def mndwi_composite(year: int, aoi):
    """
    Dry-season (May-Oct) MNDWI median composite for a single year.
    MNDWI = (B3 Green - B11 SWIR1) / (B3 + B11)
    Source: https://developers.google.com/earth-engine/apidocs/ee-image-normalizeddifference
    """
    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(f"{year}-01-01", f"{year}-12-31")
        .filter(ee.Filter.calendarRange(5, 10, "month"))   # May-Oct dry season
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
        .select(["B3", "B11"]))

    def compute_mndwi(img):
        return img.normalizedDifference(["B3", "B11"]).rename("mndwi")

    return col.map(compute_mndwi).median()

def _otsu_threshold(counts, centers):
    """
    Pure Python Otsu's method on GEE histogram output.
    Returns optimal threshold value.
    Source: https://medium.com/google-earth/otsus-method-for-image-segmentation-f5c48f405e
    """
    total = sum(counts)
    if total == 0:
        return 0.0

    best_threshold = centers[0]
    best_bss = 0.0
    weight_bg = 0.0
    mean_bg = 0.0

    for i in range(len(counts)):
        w = counts[i] / total
        weight_bg += w
        if weight_bg == 0:
            continue
        mean_bg += w * centers[i]
        weight_fg = 1.0 - weight_bg
        if weight_fg == 0:
            break
        fg_counts  = counts[i + 1:]
        fg_centers = centers[i + 1:]
        fg_total = sum(fg_counts)
        mean_fg = (sum(c * v for c, v in zip(fg_counts, fg_centers)) / fg_total) if fg_total > 0 else 0
        mu_bg = mean_bg / weight_bg
        bss = weight_bg * weight_fg * (mu_bg - mean_fg) ** 2
        if bss > best_bss:
            best_bss = bss
            best_threshold = centers[i]

    return best_threshold

def _otsu_fallback(threshold: float, total_count: int) -> bool:
    """
    Mirrors web/lib/coastline-metrics.ts otsuFallback().
    Fall back to mndwi > 0 if histogram is too sparse or threshold is degenerate.
    """
    if total_count < 100:
        return True
    if threshold < -0.8 or threshold > 0.8:
        return True
    return False

def compute_water_mask(mndwi_image, aoi, scale: int):
    """
    Compute Otsu threshold on MNDWI image, return binary water mask.
    Falls back to mndwi > 0 if histogram is degenerate (Pitfall 2).
    """
    hist_result = mndwi_image.reduceRegion(
        reducer=ee.Reducer.histogram(maxBuckets=256),
        geometry=aoi,
        scale=scale,
        maxPixels=int(1e9),
    ).getInfo()

    hist = (hist_result or {}).get("mndwi") or {}
    counts = hist.get("histogram") or []
    centers = hist.get("bucketMeans") or []

    if not counts or not centers:
        return mndwi_image.gt(0)

    total = int(sum(counts))
    threshold = _otsu_threshold(counts, centers)

    if _otsu_fallback(threshold, total):
        return mndwi_image.gt(0)

    return mndwi_image.gt(threshold)

def apply_min_area_filter(water_mask, min_area_m2: int, scale: int):
    """
    Remove water objects smaller than min_area_m2.
    CRITICAL PITFALL 1: caller MUST pass water_mask.selfMask() to avoid
    counting the giant connected land-pixel component.
    Source: https://developers.google.com/earth-engine/apidocs/ee-image-connectedpixelcount
    """
    connected_count = water_mask.connectedPixelCount(maxSize=1024, eightConnected=True)
    pixel_area = ee.Image.pixelArea()
    object_area = connected_count.multiply(pixel_area)
    area_mask = object_area.gte(min_area_m2)
    return water_mask.updateMask(area_mask)

def compute_slr_exposure(aoi, scale: int = 30):
    """
    Percentage of AOI land area (SRTM elevation > 0) below 1m, 2m, 5m elevation.
    Dataset: USGS/SRTMGL1_003 (30 m DEM, global).
    SRTM has +3-5 m positive bias in vegetated zones — UI must label as 'indicative'.
    """
    srtm = ee.Image("USGS/SRTMGL1_003").select("elevation")
    land = srtm.gt(0)
    total_result = land.reduceRegion(
        reducer=ee.Reducer.sum(), geometry=aoi, scale=scale, maxPixels=int(1e9),
    ).getInfo() or {}
    total_land = total_result.get("elevation", 1) or 1

    results = {}
    for threshold in [1, 2, 5]:
        exposed = srtm.lte(threshold).And(land)
        res = exposed.reduceRegion(
            reducer=ee.Reducer.sum(), geometry=aoi, scale=scale, maxPixels=int(1e9),
        ).getInfo() or {}
        count = res.get("elevation", 0) or 0
        results[f"slr_pct_{threshold}m"] = round(count / max(total_land, 1) * 100, 1)
    return results

def compute_cmip6_temp_delta(aoi, model: str = "ACCESS-CM2"):
    """
    SSP585 temperature rise: mean 2090-2100 minus mean 2020-2030 (Celsius = Kelvin delta).
    Dataset: NASA/GDDP-CMIP6 (27.5 km resolution).
    Returns None if GEE grid misses the tiny bbox (Pitfall 3).
    """
    def _mean_temp(start, end):
        res = (ee.ImageCollection("NASA/GDDP-CMIP6")
            .filter(ee.Filter.eq("model", model))
            .filter(ee.Filter.eq("scenario", "ssp585"))
            .filterDate(start, end)
            .select("tas")
            .mean()
            .reduceRegion(ee.Reducer.mean(), aoi, scale=27500, maxPixels=int(1e9))
            .getInfo() or {})
        return res.get("tas")

    near_k = _mean_temp("2020-01-01", "2030-12-31")
    far_k  = _mean_temp("2090-01-01", "2100-12-31")

    if near_k is None or far_k is None:
        return None
    return round(far_k - near_k, 1)

# ── Analysis ──────────────────────────────────────────────────────────────────
def run_analysis(slug: str) -> dict:
    loc = LOCATIONS.get(slug)
    if not loc:
        raise ValueError(f"Unknown slug: {slug}")
    if not loc["live"]:
        raise ValueError(f"{slug} is not yet live")

    bbox        = loc["bbox"]
    scale       = loc.get("scale", 30)
    min_area_m2 = loc.get("min_area_m2", 5000)
    aoi         = ee.Geometry.Rectangle(bbox)

    # 1. Dry-season MNDWI composites
    baseline = mndwi_composite(BASELINE_YEAR, aoi)
    current  = mndwi_composite(CURRENT_YEAR,  aoi)

    # 2. Otsu adaptive thresholds → binary water masks
    water_b = compute_water_mask(baseline, aoi, scale=scale)
    water_c = compute_water_mask(current,  aoi, scale=scale)

    # 3. Connected-components 0.5 ha (or 0.1 ha for atolls) min-area filter
    #    PITFALL 1: selfMask() BEFORE connectedPixelCount — otherwise the
    #    giant land-pixel component passes the filter and breaks everything.
    water_b_filtered = apply_min_area_filter(water_b.selfMask(), min_area_m2, scale)
    water_c_filtered = apply_min_area_filter(water_c.selfMask(), min_area_m2, scale)

    # For change detection we need unmasked 0/1 images; unmask filtered water back to 0
    water_b_bin = water_b_filtered.unmask(0)
    water_c_bin = water_c_filtered.unmask(0)

    # 4. Coastline change: land→water = erosion | water→land = accretion | land→land = stable
    result = (
        water_b_bin.eq(0).And(water_c_bin.eq(1)).rename("erosion")
        .addBands(water_b_bin.eq(1).And(water_c_bin.eq(0)).rename("accretion"))
        .addBands(water_b_bin.eq(0).And(water_c_bin.eq(0)).rename("stable"))
        .reduceRegion(ee.Reducer.sum(), aoi, scale, maxPixels=int(1e9))
        .getInfo()
    ) or {}

    px           = scale * scale
    erosion_m2   = (result.get("erosion")   or 0) * px
    accretion_m2 = (result.get("accretion") or 0) * px
    stable_m2    = (result.get("stable")    or 0) * px
    total_m2     = erosion_m2 + accretion_m2 + stable_m2

    lon_min, lat_min, lon_max, lat_max = bbox
    coast_len    = math.sqrt((lon_max - lon_min) ** 2 + (lat_max - lat_min) ** 2) * 111_000
    erosion_m    = erosion_m2   / max(coast_len, 1)
    accretion_m  = accretion_m2 / max(coast_len, 1)
    net_change_m = accretion_m  - erosion_m
    stable_pct   = (stable_m2 / total_m2 * 100) if total_m2 > 0 else 0

    # 5. SLR exposure (always-on; SRTM scale fixed at 30 m)
    try:
        slr = compute_slr_exposure(aoi, scale=30)
    except Exception:
        slr = {"slr_pct_1m": None, "slr_pct_2m": None, "slr_pct_5m": None}

    # 6. CMIP6 temperature delta (graceful null on missing grid — Pitfall 3)
    try:
        temp_delta = compute_cmip6_temp_delta(aoi)
    except Exception:
        temp_delta = None

    return {
        "erosion_m":         round(erosion_m    * 10) / 10,
        "accretion_m":       round(accretion_m  * 10) / 10,
        "net_change_m":      round(net_change_m * 10) / 10,
        "stable_pct":        round(stable_pct   * 10) / 10,
        "erosion_m2":        round(erosion_m2),
        "accretion_m2":      round(accretion_m2),
        "period_start":      str(BASELINE_YEAR),
        "period_end":        str(CURRENT_YEAR),
        "algorithm":         "MNDWI+Otsu",
        "mapImageUrl":       "",
        "slr_pct_1m":        slr.get("slr_pct_1m"),
        "slr_pct_2m":        slr.get("slr_pct_2m"),
        "slr_pct_5m":        slr.get("slr_pct_5m"),
        "cmip6_temp_delta_c": temp_delta,
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
