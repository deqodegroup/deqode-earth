"""
DEQODE Group — Earth Intelligence
Niue Coastal Erosion Analysis using Sentinel-1 SAR
Free data via Google Earth Engine
Case study for Santiago Network pitch (Palau, Fiji)
"""

import ee
import geemap
import os

# Initialise Earth Engine
ee.Initialize(project=None)

# ── AREA OF INTEREST: Niue Coastline ─────────────────────────────────────────
# Niue bounding box (full island)
niue_aoi = ee.Geometry.Rectangle([
    -169.9647, -19.1550,   # SW corner [lon, lat]
    -169.7800, -18.9550    # NE corner [lon, lat]
])

# ── DATE RANGES ───────────────────────────────────────────────────────────────
BASELINE_START = '2020-01-01'
BASELINE_END   = '2020-12-31'
RECENT_START   = '2025-01-01'
RECENT_END     = '2025-12-31'

# ── SENTINEL-1 SAR COLLECTION ────────────────────────────────────────────────
def get_sentinel1(start, end, aoi):
    return (
        ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterBounds(aoi)
        .filterDate(start, end)
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
        .select('VV')
        .mean()  # Temporal composite
    )

print("Fetching Sentinel-1 baseline (2020)...")
baseline = get_sentinel1(BASELINE_START, BASELINE_END, niue_aoi)

print("Fetching Sentinel-1 recent (2025)...")
recent = get_sentinel1(RECENT_START, RECENT_END, niue_aoi)

# ── CHANGE DETECTION ─────────────────────────────────────────────────────────
# Difference between epochs — negative = backscatter loss (erosion/change)
change = recent.subtract(baseline).rename('coastal_change')

# ── WATER MASK (detect land/water boundary shift) ────────────────────────────
# Threshold: SAR VV < -15 dB typically = water surface
water_baseline = baseline.lt(-15).rename('water_2020')
water_recent   = recent.lt(-15).rename('water_2025')

# Land-to-water conversion = coastal loss
coastal_loss = water_baseline.eq(0).And(water_recent.eq(1)).rename('coastal_loss')
# Water-to-land = accretion
coastal_gain = water_baseline.eq(1).And(water_recent.eq(0)).rename('coastal_gain')

# ── EXPORT STATISTICS ────────────────────────────────────────────────────────
print("\nCalculating coastal change statistics...")

loss_area = coastal_loss.multiply(ee.Image.pixelArea()).reduceRegion(
    reducer=ee.Reducer.sum(),
    geometry=niue_aoi,
    scale=10,
    maxPixels=1e9
)

gain_area = coastal_gain.multiply(ee.Image.pixelArea()).reduceRegion(
    reducer=ee.Reducer.sum(),
    geometry=niue_aoi,
    scale=10,
    maxPixels=1e9
)

mean_change = change.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=niue_aoi,
    scale=10,
    maxPixels=1e9
)

loss_sqm  = loss_area.get('coastal_loss').getInfo()
gain_sqm  = gain_area.get('coastal_gain').getInfo()
avg_change = mean_change.get('coastal_change').getInfo()

print(f"\n{'='*50}")
print(f"  DEQODE GROUP — NIUE COASTAL INTELLIGENCE")
print(f"  Baseline: 2020  |  Current: 2025")
print(f"{'='*50}")
print(f"  Coastal Loss (erosion): {loss_sqm:,.0f} m²  ({loss_sqm/1e4:,.2f} ha)")
print(f"  Coastal Gain (accretion): {gain_sqm:,.0f} m²  ({gain_sqm/1e4:,.2f} ha)")
print(f"  Net change: {(gain_sqm - loss_sqm):,.0f} m²")
print(f"  Mean backscatter change: {avg_change:.3f} dB")
print(f"{'='*50}\n")

# ── INTERACTIVE MAP ───────────────────────────────────────────────────────────
print("Generating interactive map...")

Map = geemap.Map(center=[-19.05, -169.87], zoom=12)
Map.add_basemap('SATELLITE')

# Visualisation params
sar_vis    = {'min': -25, 'max': 0, 'palette': ['black', 'white']}
change_vis = {'min': -5, 'max': 5, 'palette': ['#d73027','#ffffff','#1a9850']}
loss_vis   = {'min': 0, 'max': 1, 'palette': ['#00000000','#d73027']}
gain_vis   = {'min': 0, 'max': 1, 'palette': ['#00000000','#1a9850']}

Map.addLayer(baseline,      sar_vis,    'SAR Baseline 2020',  False)
Map.addLayer(recent,        sar_vis,    'SAR Recent 2025',    False)
Map.addLayer(change,        change_vis, 'Backscatter Change 2020→2025')
Map.addLayer(coastal_loss,  loss_vis,   'Coastal Loss (Erosion)')
Map.addLayer(coastal_gain,  gain_vis,   'Coastal Gain (Accretion)')

# Save map
output_path = os.path.join(os.path.dirname(__file__), 'niue_coastal_map.html')
Map.save(output_path)
print(f"Map saved: {output_path}")
print("Open niue_coastal_map.html in your browser to explore.")
