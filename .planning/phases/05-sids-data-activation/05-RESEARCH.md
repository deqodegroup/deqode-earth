# Phase 5: SIDS Data Activation — Research

**Researched:** 2026-05-24
**Domain:** Google Earth Engine Python API — MNDWI coastline algorithm, dry-season composites, connected-components filtering, SLR exposure, CMIP6 climate projections
**Confidence:** HIGH (GEE Python API verified against official docs; Vercel limits verified against official docs 2026-02-27)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EARTH-14 | Replace NDWI > 0 with MNDWI + Otsu threshold + dry-season composites (May-Oct) + connected-components (0.5ha min). Match DEA Coastlines / CoastSat methodology. | MNDWI formula, Otsu pattern, calendarRange filter, connectedPixelCount area filter — all verified in GEE Python API docs |
| EARTH-15 | Live coastline data for all 8 Pacific SIDS regions. SLR exposure thresholds via GEE SRTM. NASA NEX-GDDP-CMIP6 climate projections SSP585. | SRTM USGS/SRTMGL1_003 + NASA/GDDP-CMIP6 dataset IDs confirmed; 8 SIDS already have `isLive: true` in regions.ts; analyse.py LOCATIONS dict needs live=True for all 8 |
</phase_requirements>

---

## Summary

Phase 5 has two interlocked tasks. First, fix the coastline algorithm in `web/api/analyse.py` — the current NDWI > 0 binary threshold produces tidal-bias artefacts because the NIR band (B8) used in NDWI absorbs strongly in water but is also confused by shallow-water turbidity and wet sand. MNDWI (Modified Normalized Difference Water Index) using Green (B3) minus SWIR1 (B11) is the correct index: SWIR1 is absorbed more completely in water and less confused by non-water surfaces. Adding Otsu's automatic threshold finder, a dry-season composite filter (May–October avoids wet-season cloud and seasonal water extent variation), and a 0.5 ha minimum connected-components filter eliminates specular reflections and lagoon fragments. This matches the DEA Coastlines v3.0 and CoastSat methodologies that researchers at COPRRRA will recognise.

Second, activate all 8 SIDS slugs (all already `isLive: true` in regions.ts but currently `live: False` in analyse.py's internal LOCATIONS dict), add SLR exposure metrics using SRTM elevation thresholds (1 m, 2 m, 5 m bands above sea level), and wire NASA/GDDP-CMIP6 SSP585 annual temperature trends per region into the CoastlineModule UI. The UI changes are isolated — no new routes needed, just new fields on the `CoastlineMetrics` type and new display cards in MetricCards.tsx.

**Primary recommendation:** Rewrite `run_analysis()` in `analyse.py` with MNDWI + Otsu + calendarRange(5,10) dry-season composites + connectedPixelCount area filter. Extend the response payload with `slr_exposure_pct_1m`, `slr_exposure_pct_2m`, and `cmip6_temp_delta_c`. Update CoastlineModule's spec display and MetricCards to surface the new fields.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `earthengine-api` | Already in `web/api/` (Python Vercel function) | GEE Python SDK — all satellite processing | GEE is the only platform with free Sentinel-2 access at island scale |
| `COPERNICUS/S2_SR_HARMONIZED` | GEE dataset | Surface-reflectance-corrected S2 | Harmonised across processing baselines; B11 SWIR1 available |
| `USGS/SRTMGL1_003` | GEE dataset | 30 m DEM for SLR exposure | Free, global, already in GEE catalog; standard for coastal elevation cutoffs |
| `NASA/GDDP-CMIP6` | GEE dataset | SSP585 climate projections | Only CMIP6 dataset in GEE; daily downscaled, 1950–2100 |

### Vercel Runtime Limits (CONFIRMED 2026-02-27)

| Plan | Default | Maximum |
|------|---------|---------|
| Hobby | 300 s | 300 s |
| Pro | 300 s | 800 s |

Fluid Compute is enabled by default. Python serverless function `web/api/analyse.py` uses the legacy `vercel.json` `functions.maxDuration` config pattern. Current GEE calls take ~10–30 s for single-region analysis. For 8 SIDS called sequentially in a single invocation this would approach 240 s — stay under Hobby 300 s limit if called per-region (one slug per request), which is the existing architecture.

**Do not change to batch/parallel per-request calls.** Keep one slug per POST. The 8 SIDS are activated by unblocking `live: True` in the LOCATIONS dict — each region is called individually from the frontend CoastlineModule.

---

## Architecture Patterns

### Recommended File Structure (changes only)

```
web/
├── api/
│   └── analyse.py            ← rewrite run_analysis() here
├── components/
│   └── modules/
│       └── coastline/
│           ├── CoastlineModule.tsx   ← add slr_exposure + cmip6_temp_delta display
│           └── MetricCards.tsx       ← extend CoastlineMetrics type + new cards
└── lib/
    └── coastline-metrics.test.ts     ← Wave 0 unit tests (pure functions only)
```

### Pattern 1: MNDWI + Otsu Composite

**What:** Replace `ndwi_composite()` function. Compute MNDWI on each scene, build seasonal composite, extract Otsu threshold as a scalar, apply as binary water mask.

**When to use:** Any water/land binary classification from Sentinel-2 where tidal bias is a concern (all SIDS).

**Exact GEE Python API:**
```python
# Source: developers.google.com/earth-engine/apidocs/ee-image-normalizeddifference
# Source: developers.google.com/earth-engine/apidocs/ee-filter-calendarrange

def mndwi_composite(start_year: int, end_year: int, aoi):
    """
    Dry-season (May-Oct) MNDWI median composite.
    MNDWI = (Green - SWIR1) / (Green + SWIR1) = (B3 - B11) / (B3 + B11)
    """
    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(f"{start_year}-01-01", f"{end_year}-12-31")
        .filter(ee.Filter.calendarRange(5, 10, "month"))   # May–October dry season
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
        .select(["B3", "B11"]))
    
    def compute_mndwi(img):
        return img.normalizedDifference(["B3", "B11"]).rename("mndwi")
    
    return col.map(compute_mndwi).median()
```

### Pattern 2: Otsu Threshold Application

**What:** Otsu is available via `histogram` reducer + client-side Python implementation. GEE does not expose `ee.Image.otsu()` as a documented public method in the Python API as of May 2026. The correct approach is to compute a histogram over the AOI and apply Otsu's method client-side using the histogram counts.

**Confidence:** MEDIUM — GEE JavaScript examples show `otsu()` in community packages (users/gena/packages:thresholding), but this is JavaScript-only. The Python API equivalent uses `reduceRegion(ee.Reducer.histogram())` and client-side Otsu.

**Exact pattern:**
```python
# Source: medium.com/google-earth/otsus-method-for-image-segmentation-f5c48f405e

def otsu_threshold(histogram_counts: list, bin_centers: list) -> float:
    """
    Pure Python Otsu implementation on GEE histogram output.
    histogram_counts: list of pixel counts per bin
    bin_centers: list of MNDWI values per bin
    Returns: optimal threshold value
    """
    total = sum(histogram_counts)
    if total == 0:
        return 0.0
    
    best_threshold = bin_centers[0]
    best_bss = 0.0
    
    weight_bg = 0.0
    mean_bg = 0.0
    
    for i, (count, center) in enumerate(zip(histogram_counts, bin_centers)):
        w = count / total
        weight_bg += w
        if weight_bg == 0:
            continue
        mean_bg += w * center
        weight_fg = 1.0 - weight_bg
        if weight_fg == 0:
            break
        mean_fg = (sum(c * v for c, v in zip(histogram_counts[i+1:], bin_centers[i+1:])) 
                   / sum(histogram_counts[i+1:]) if sum(histogram_counts[i+1:]) > 0 else 0)
        bss = weight_bg * weight_fg * (mean_bg / weight_bg - mean_fg) ** 2
        if bss > best_bss:
            best_bss = bss
            best_threshold = center
    
    return best_threshold

def compute_water_mask(mndwi_image, aoi, scale=30):
    """
    Compute Otsu threshold on MNDWI image, return binary water mask.
    """
    hist_result = mndwi_image.reduceRegion(
        reducer=ee.Reducer.histogram(maxBuckets=256),
        geometry=aoi,
        scale=scale,
        maxPixels=int(1e9)
    ).getInfo()
    
    hist = hist_result.get("mndwi", {})
    counts = hist.get("histogram", [])
    centers = hist.get("bucketMeans", [])
    
    if not counts or not centers:
        return mndwi_image.gt(0)  # fallback: MNDWI > 0 (old behaviour)
    
    threshold = otsu_threshold(counts, centers)
    return mndwi_image.gt(threshold)
```

### Pattern 3: Connected-Components Minimum Area Filter (0.5 ha = 5,000 m²)

**What:** Remove isolated water pixels smaller than 0.5 ha. At 30 m scale each pixel = 900 m². 0.5 ha = 5,000 m² ≈ 5-6 pixels minimum.

**Exact GEE Python API:**
```python
# Source: developers.google.com/earth-engine/guides/image_objects
# Source: developers.google.com/earth-engine/apidocs/ee-image-connectedpixelcount

def apply_min_area_filter(water_mask, min_area_m2=5000, scale=30):
    """
    Remove water objects smaller than min_area_m2 (default 0.5 ha).
    """
    # Count connected pixels per object
    connected_count = water_mask.connectedPixelCount(
        maxSize=1024, eightConnected=True
    )
    # Multiply by pixel area (30x30 = 900 m²)
    pixel_area = ee.Image.pixelArea()
    object_area = connected_count.multiply(pixel_area)
    
    # Keep only objects meeting minimum area
    area_mask = object_area.gte(min_area_m2)
    return water_mask.updateMask(area_mask)
```

**Important:** `connectedPixelCount` uses the **masked** image as the input. Only pixels where the mask is valid (i.e., water pixels == 1) are counted. Non-water pixels are automatically excluded because the water_mask binary image has 0s unmasked. To use correctly: apply the water threshold first, then call `selfMask()` to mask 0s, then apply `connectedPixelCount`.

```python
water_binary = water_mask.selfMask()  # mask the 0 (non-water) pixels
filtered_water = apply_min_area_filter(water_binary, min_area_m2=5000)
```

### Pattern 4: Dry-Season Date Filter

**Exact syntax (verified):**
```python
# Source: developers.google.com/earth-engine/apidocs/ee-filter-calendarrange
.filter(ee.Filter.calendarRange(5, 10, "month"))
```

This retains scenes from May (month=5) through October (month=10) inclusive. Works correctly across year boundaries since S2 images span multiple years.

### Pattern 5: SLR Exposure via SRTM

**What:** For each SIDS region, compute the percentage of land area below 1 m, 2 m, and 5 m elevation using SRTM 30 m DEM. This gives a simple inundation exposure metric without needing CoastalDEM.

**Caveat:** SRTM has a +3–5 m positive vertical bias in vegetated coastal areas (trees over beaches read as high elevation). For Pacific atolls (flat limestone, sparse vegetation) the bias is less severe — acceptable for COPRRRA demo. Flag in UI as "indicative only."

**Dataset:** `USGS/SRTMGL1_003` — single band `elevation` in metres.

```python
# Source: developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003

def compute_slr_exposure(aoi, scale=30):
    """
    Returns percentage of AOI land area below 1m, 2m, and 5m elevation.
    """
    srtm = ee.Image("USGS/SRTMGL1_003").select("elevation")
    
    # Total land pixels (elevation > 0, i.e., above sea level)
    land = srtm.gt(0)
    total_land = land.reduceRegion(
        reducer=ee.Reducer.sum(), geometry=aoi, scale=scale, maxPixels=int(1e9)
    ).getInfo().get("elevation", 1)
    
    results = {}
    for threshold in [1, 2, 5]:
        exposed = srtm.lte(threshold).And(land)
        count = exposed.reduceRegion(
            reducer=ee.Reducer.sum(), geometry=aoi, scale=scale, maxPixels=int(1e9)
        ).getInfo().get("elevation", 0)
        results[f"slr_pct_{threshold}m"] = round(count / max(total_land, 1) * 100, 1)
    
    return results  # {"slr_pct_1m": X, "slr_pct_2m": Y, "slr_pct_5m": Z}
```

### Pattern 6: CMIP6 SSP585 Temperature Delta

**What:** Compute mean annual temperature for 2020–2030 vs 2090–2100 under SSP585, report the delta in °C.

**Dataset:** `NASA/GDDP-CMIP6` — filter by `scenario = "ssp585"`, band `tas` (daily mean temperature in Kelvin). Use model `ACCESS-CM2` as single representative model (computationally cheap; full ensemble average is GEE-quota-intensive).

```python
# Source: developers.google.com/earth-engine/datasets/catalog/NASA_GDDP-CMIP6

def compute_cmip6_temp_delta(aoi, model="ACCESS-CM2"):
    """
    Temperature rise under SSP585: mean 2090-2100 minus mean 2020-2030.
    Returns delta in Celsius.
    """
    def mean_annual_temp(start, end):
        return (ee.ImageCollection("NASA/GDDP-CMIP6")
            .filter(ee.Filter.eq("model", model))
            .filter(ee.Filter.eq("scenario", "ssp585"))
            .filterDate(start, end)
            .select("tas")
            .mean()
            .reduceRegion(ee.Reducer.mean(), aoi, scale=27500, maxPixels=int(1e9))
            .getInfo()
            .get("tas", None))
    
    near_k = mean_annual_temp("2020-01-01", "2030-12-31")
    far_k  = mean_annual_temp("2090-01-01", "2100-12-31")
    
    if near_k is None or far_k is None:
        return None
    return round(far_k - near_k, 1)  # already in K difference = Celsius difference
```

**Quota note:** CMIP6 has 27.5 km resolution — `scale=27500` is appropriate and fast. These two calls add ~3–5 s per region.

### Pattern 7: Updated Response Payload

The `run_analysis()` function must return the extended payload. Existing fields unchanged for backwards compatibility:

```python
return {
    # Existing coastline fields (unchanged)
    "erosion_m":    ...,
    "accretion_m":  ...,
    "net_change_m": ...,
    "stable_pct":   ...,
    "erosion_m2":   ...,
    "accretion_m2": ...,
    "period_start": "2019",
    "period_end":   "2024",
    "algorithm":    "MNDWI+Otsu",   # NEW — for UI display
    "mapImageUrl":  "",
    # New SLR fields
    "slr_pct_1m":   ...,   # % of land area below 1m elevation
    "slr_pct_2m":   ...,   # % of land area below 2m elevation  
    "slr_pct_5m":   ...,   # % of land area below 5m elevation
    # New climate projection field
    "cmip6_temp_delta_c": ...,   # SSP585 2090-2100 minus 2020-2030 in °C
}
```

### Pattern 8: UI Updates

Two targeted changes in the CoastlineModule stack:

1. **MetricCards.tsx** — extend `CoastlineMetrics` interface with the 4 new optional fields; add a SLR exposure card with 3 threshold bars and a climate projection card.

2. **CoastlineModule.tsx** — update the spec table entry: change `"Index": "NDWI"` to `"Index": "MNDWI+Otsu"` and add `"Season": "Dry (May–Oct)"`. The sensor badge at bottom-left also reads `S2 · NDWI` — update to `S2 · MNDWI+Otsu`.

3. **analyse.py LOCATIONS dict** — change `"live": False` to `"live": True` for all 8 slugs. They're already `isLive: true` in regions.ts; the mismatch was a Phase 2 deferral.

### Anti-Patterns to Avoid

- **Calling analyse.py for all 8 SIDS in a single Vercel request** — each region is ~30–60 s total with the new algorithm; 8 in one call would exceed 300 s Hobby timeout. Keep the existing per-slug request pattern.
- **Using ee.Image.otsu() as a direct GEE Python call** — the documented `otsu()` exists in community JavaScript packages only; use the histogram + client-side Python pattern above.
- **Annual composites for SIDS** — wet season (Nov–Apr) in the Pacific drives flooding and temporary water extent; using annual composites inflates the water mask. Dry-season compositing is mandatory.
- **SRTM for absolute tide-line accuracy** — SRTM is suitable for a COPRRRA demo SLR indicator but should be labelled "indicative." Do not claim 1 m precision in the UI.
- **Using Sentinel-1 for coastline** — S1 has no coverage over SIDS (already verified and documented in project memory). S2 only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spectral index computation | Custom band math functions | `ee.Image.normalizedDifference(["B3", "B11"])` | Built-in handles div-by-zero, band ordering |
| Connected-components area filtering | Custom pixel flood-fill | `ee.Image.connectedPixelCount()` + `ee.Image.pixelArea()` | GEE native, runs server-side, handles scale |
| Cloud masking | Custom threshold on multiple bands | `ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15)` | Scene-level metadata filter, fast |
| Dry-season date selection | Per-year for-loop with filterDate | `ee.Filter.calendarRange(5, 10, "month")` | Applies across all years in one pass |
| Climate projections | Building your own CMIP6 parser | `NASA/GDDP-CMIP6` GEE ImageCollection | Already downscaled, daily, accessible via existing GEE auth |

---

## Common Pitfalls

### Pitfall 1: selfMask() Before connectedPixelCount()

**What goes wrong:** If you call `connectedPixelCount()` on a binary 0/1 image (not a masked image), it counts ALL connected same-value pixels — including the large connected region of 0 (non-water) pixels, which covers the entire island land mass. This produces a massive object that passes the area filter, destroying the filter entirely.

**Why it happens:** `connectedPixelCount` operates on unmasked pixels by value. The 0-valued "land" pixels form one giant connected component.

**How to avoid:** Always call `water_mask.selfMask()` first to mask the 0-valued pixels before calling `connectedPixelCount`. The filter then only counts water-pixel connected components.

**Warning signs:** `stable_pct` comes back as 0% or `erosion_m2` covers the entire bbox area.

### Pitfall 2: Otsu Histogram Fallback

**What goes wrong:** For very small AOIs (like Tuvalu's narrow atolls at bbox 0.3° wide) or cloud-heavy periods, the histogram may have zero or near-zero counts in many bins, causing a degenerate threshold near -1.0 or +1.0. This produces either all-water or all-land results.

**Why it happens:** The histogram bins are distributed across the full MNDWI range. If a region has very few valid pixels (after cloud filtering), the Otsu inter-class variance will be maximised at the extremes.

**How to avoid:** Always fall back to `mndwi.gt(0)` if the histogram has fewer than 100 total counts, or if the Otsu threshold is outside (-0.8, 0.8). Log the threshold and pixel count in the response for debugging.

**Warning signs:** net_change_m is implausibly large (> 100 m) for a small atoll.

### Pitfall 3: CMIP6 Band Name Varies by Model

**What goes wrong:** Not all CMIP6 models in GEE have all bands for all scenarios. Some models are missing `tas` for SSP585 in certain date ranges.

**How to avoid:** Add a `try/except` around the CMIP6 calls. Return `None` for `cmip6_temp_delta_c` if the model has no data — the UI handles `None` as "No data."

**Model selection:** `ACCESS-CM2` is well-represented in GEE for SSP585; use it as the default. If it fails, return null rather than trying another model.

### Pitfall 4: analyse.py LOCATIONS dict vs regions.ts isLive

**What goes wrong:** `regions.ts` already has all 8 SIDS as `isLive: true`. The Python `LOCATIONS` dict still has 5 slugs as `"live": False`. The frontend calls `/api/analyse` → gets `{slug} is not yet live` 400 error → CoastlineModule shows error state for those regions.

**How to avoid:** The fix is two lines per slug in analyse.py LOCATIONS dict. Do this first, before algorithm changes, to verify the GEE calls work for each region's bbox.

### Pitfall 5: 30 m Scale vs. Atoll Width

**What goes wrong:** Some SIDS have very narrow features. Tuvalu's Funafuti atoll is ~200 m wide — only 6–7 pixels at 30 m. The connected-components filter at 5,000 m² (5–6 pixels) may eliminate legitimate atoll coastline pixels that form thin linear features.

**How to avoid:** Use 10 m scale for analysis where pixel budget allows, OR lower the minimum area filter to 1,000 m² (1 pixel minimum) for atolls. The bbox sizes in regions.ts tell you which are narrow: if bbox width < 0.1° (~11 km), use a lower min_area or skip the area filter. Document the scale decision in the spec table.

**Atolls affected:** Tuvalu (bbox width 0.3°), Kiribati (0.2°), Marshall Islands (0.4°).

---

## Code Examples

### Complete Replacement for run_analysis() Core Logic

```python
# Source: GEE Python API docs — ic_filtering, image_objects, apidocs

def run_analysis(slug: str) -> dict:
    loc = LOCATIONS.get(slug)
    if not loc or not loc["live"]:
        raise ValueError(f"{slug} is not live")

    bbox = loc["bbox"]
    aoi  = ee.Geometry.Rectangle(bbox)

    # 1. Build dry-season MNDWI composites
    baseline = mndwi_composite(2019, 2019, aoi)   # 2019 baseline
    current  = mndwi_composite(2024, 2024, aoi)   # 2024 current

    # 2. Compute Otsu thresholds
    water_b = compute_water_mask(baseline, aoi, scale=30)
    water_c = compute_water_mask(current,  aoi, scale=30)

    # 3. Apply connected-components area filter (0.5 ha min)
    water_b = apply_min_area_filter(water_b.selfMask())
    water_c = apply_min_area_filter(water_c.selfMask())

    # 4. Coastline change computation (same as current)
    result = (
        water_b.eq(0).And(water_c.eq(1)).rename("erosion")
        .addBands(water_b.eq(1).And(water_c.eq(0)).rename("accretion"))
        .addBands(water_b.eq(0).And(water_c.eq(0)).rename("stable"))
        .reduceRegion(ee.Reducer.sum(), aoi, 30, maxPixels=int(1e9))
        .getInfo()
    )

    # 5. SLR exposure
    slr = compute_slr_exposure(aoi)

    # 6. CMIP6 temperature delta (graceful fallback)
    try:
        temp_delta = compute_cmip6_temp_delta(aoi)
    except Exception:
        temp_delta = None

    # Metric derivation (unchanged from current)
    px           = 30 * 30
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
        "erosion_m":         round(erosion_m    * 10) / 10,
        "accretion_m":       round(accretion_m  * 10) / 10,
        "net_change_m":      round(net_change_m * 10) / 10,
        "stable_pct":        round(stable_pct   * 10) / 10,
        "erosion_m2":        round(erosion_m2),
        "accretion_m2":      round(accretion_m2),
        "period_start":      "2019",
        "period_end":        "2024",
        "algorithm":         "MNDWI+Otsu",
        "mapImageUrl":       "",
        "slr_pct_1m":        slr.get("slr_pct_1m"),
        "slr_pct_2m":        slr.get("slr_pct_2m"),
        "slr_pct_5m":        slr.get("slr_pct_5m"),
        "cmip6_temp_delta_c": temp_delta,
    }
```

### CoastlineMetrics TypeScript Extension

```typescript
// In MetricCards.tsx — extend the interface, new fields optional for back-compat
export interface CoastlineMetrics {
  // Existing fields — unchanged
  erosion_m: number;
  accretion_m: number;
  net_change_m: number;
  stable_pct: number;
  erosion_m2: number;
  accretion_m2: number;
  period_start: string;
  period_end: string;
  mapImageUrl: string;
  // New optional fields
  algorithm?: string;
  slr_pct_1m?: number | null;
  slr_pct_2m?: number | null;
  slr_pct_5m?: number | null;
  cmip6_temp_delta_c?: number | null;
}
```

### Algorithm Badge in CoastlineModule.tsx

```typescript
// Replace the existing "NDWI" spec entry with dynamic algorithm value:
{ label: "Index",  value: data?.algorithm ?? "MNDWI+Otsu" },
{ label: "Season", value: "Dry (May–Oct)" },
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NDWI > 0 fixed threshold | MNDWI + Otsu adaptive threshold | DEA Coastlines v3.0 (2024) | Eliminates tidal-phase and turbidity bias |
| Annual composite (all scenes) | Dry-season composite (May–Oct) | CoastSat best practice, 2019+ | Reduces cloud contamination and seasonal water extent variation |
| No minimum object size | 0.5 ha connected-components filter | Standard since DEA Coastlines v2 | Eliminates specular glints and lagoon fragments |
| B3 + B8 (Green + NIR) | B3 + B11 (Green + SWIR1) | Industry shift from NDWI to MNDWI, ~2015 | SWIR1 absorbed completely by water; not confused by shallow turbid water |

**Deprecated/outdated:**
- `NDWI > 0` (B3 vs B8): Still widely used in tutorials but produces positive bias in shallow/turbid water — produces physically implausible erosion artefacts in Pacific atolls where wet sand has NIR reflectance.
- Annual composites for Pacific SIDS: Wet season cloud contamination and seasonal flooding make annual medians unreliable.

---

## Validation Architecture

> `nyquist_validation` not set in .planning/config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already installed, `web/vitest.config.ts` present) |
| Config file | `web/vitest.config.ts` — includes `*.test.ts` and `{lib,app,components}/**/*.test.ts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run` |

**Note:** GEE Python function (`analyse.py`) cannot be unit-tested in isolation without mocking the GEE SDK. Python tests are integration-only and require the `GEE_B64_KEY` env var. All unit-testable logic (metric derivation, TypeScript type validation, Otsu pure function) runs in the TypeScript/Vitest layer.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EARTH-14 | Otsu threshold implementation (pure Python) — tested as TypeScript equivalent | unit | `cd web && npx vitest run lib/coastline-metrics.test.ts` | ❌ Wave 0 |
| EARTH-14 | CoastlineMetrics type has `algorithm`, `slr_pct_*`, `cmip6_temp_delta_c` fields | unit | `cd web && npx vitest run lib/coastline-metrics.test.ts` | ❌ Wave 0 |
| EARTH-14 | Spec table in CoastlineModule shows "MNDWI+Otsu" not "NDWI" | unit | `cd web && npx vitest run components/modules/coastline/CoastlineModule.test.ts` | ❌ Wave 0 |
| EARTH-15 | All 8 SIDS slugs have `isLive: true` in regions.ts | unit | `cd web && npx vitest run lib/regions.test.ts` | ✅ (existing test, already passes) |
| EARTH-15 | MetricCards renders SLR exposure section when slr_pct_1m present | unit | `cd web && npx vitest run components/modules/coastline/MetricCards.test.ts` | ❌ Wave 0 |
| EARTH-15 | GEE analysis returns data for all 8 slugs | integration | Manual: POST to `/api/analyse` for each slug, verify 200 | Manual only |
| EARTH-15 | SLR exposure fields non-null in response | integration | Manual: POST to `/api/analyse` for niue, verify slr_pct_1m present | Manual only |

### Sampling Rate

- **Per task commit:** `cd web && npx vitest run lib/coastline-metrics.test.ts`
- **Per wave merge:** `cd web && npx vitest run`
- **Phase gate:** Full vitest suite green + manual API test for all 8 slugs

### Wave 0 Gaps

- [ ] `web/lib/coastline-metrics.test.ts` — covers EARTH-14: CoastlineMetrics type shape, metric derivation pure functions, Otsu fallback behavior (threshold outside -0.8..0.8 range)
- [ ] `web/components/modules/coastline/MetricCards.test.ts` — covers EARTH-15: SLR card renders when slr_pct_1m present, hidden when null
- [ ] `web/components/modules/coastline/CoastlineModule.test.ts` — covers EARTH-14: spec table value equals "MNDWI+Otsu"

---

## Open Questions

1. **Narrow atoll pixel budget (Tuvalu, Kiribati, Marshall Islands)**
   - What we know: Their bboxes are 0.2–0.4° wide (~22–44 km). At 30 m scale, narrow atoll strips may be only 3–5 pixels wide.
   - What's unclear: Whether the 0.5 ha connected-components filter eliminates legitimate thin coastline pixels.
   - Recommendation: Default to 10 m scale analysis for narrow atolls (< 0.1° bbox width) by reading the bbox from LOCATIONS. Add a `scale` key to the LOCATIONS dict.

2. **CMIP6 model availability in GEE for all 8 AOIs**
   - What we know: `ACCESS-CM2` with SSP585 is documented in the GEE catalog with 1950–2100 date range.
   - What's unclear: Whether GEE's CMIP6 collection has full global coverage or gaps at small Pacific island AOIs (tiny bboxes may fall between grid cells at 27.5 km resolution).
   - Recommendation: Verify with one test call for Tuvalu (smallest bbox) before assuming all 8 work. Return null gracefully on failure.

3. **Vercel Hobby vs Pro plan for the project**
   - What we know: Hobby plan max is 300 s; Pro max is 800 s.
   - What's unclear: Which plan the deqode-earth Vercel project is on.
   - Recommendation: Check Vercel dashboard. The new algorithm adds CMIP6 + SLR calls. Total expected time: ~45–60 s per request. Both plans handle this; no risk. But if switching to batch analysis later, Pro plan would be needed.

---

## Sources

### Primary (HIGH confidence)
- GEE Python API — `ee.Filter.calendarRange`: https://developers.google.com/earth-engine/apidocs/ee-filter-calendarrange
- GEE Python API — `ee.Image.normalizedDifference`: https://developers.google.com/earth-engine/apidocs/ee-image-normalizeddifference
- GEE Python API — `ee.Image.connectedPixelCount`: https://developers.google.com/earth-engine/apidocs/ee-image-connectedpixelcount
- GEE Python API — Object-based methods (connectedComponents, pixelArea): https://developers.google.com/earth-engine/guides/image_objects
- GEE Data Catalog — `USGS/SRTMGL1_003`: https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003
- GEE Data Catalog — `NASA/GDDP-CMIP6`: https://developers.google.com/earth-engine/datasets/catalog/NASA_GDDP-CMIP6
- Vercel Functions maxDuration limits (updated 2026-02-27): https://vercel.com/docs/functions/configuring-functions/duration

### Secondary (MEDIUM confidence)
- Otsu's method in GEE — histogram-based approach: https://medium.com/google-earth/otsus-method-for-image-segmentation-f5c48f405e
- DEA Coastlines open source methodology: https://github.com/GeoscienceAustralia/dea-coastlines
- CoastSat toolkit (MNDWI + supervised classification): https://github.com/kvos/CoastSat
- GEE Object-based methods Colab notebook: https://colab.research.google.com/github/google/earthengine-community/blob/master/guides/ipynb/image_objects.ipynb

### Tertiary (LOW confidence — verify before use)
- SRTM vertical bias in coastal zones: https://www.nature.com/articles/s41467-019-12808-z (research context only — not GEE-specific)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — GEE dataset IDs and Python API methods verified against official docs
- Algorithm patterns: MEDIUM-HIGH — MNDWI formula confirmed; Otsu client-side pattern confirmed via GEE Medium article + histogram reducer docs; connected-components pattern confirmed via official guide
- Pitfalls: MEDIUM — derived from known GEE behaviour + atoll geometry analysis; selfMask pitfall verified against official connected-components documentation
- SLR exposure: MEDIUM — SRTM dataset confirmed; SRTM bias documented in literature; threshold values (1m/2m/5m) are standard in coastal planning literature
- CMIP6: HIGH — dataset ID, bands, scenario names confirmed against official GEE data catalog

**Research date:** 2026-05-24
**Valid until:** 2026-08-01 (GEE API is stable; CMIP6 dataset is static; Vercel limits change infrequently)
