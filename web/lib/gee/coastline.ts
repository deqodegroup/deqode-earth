import ee from "@google/earthengine";
import { type Location } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

// Mirror original Streamlit analysis: 2020 baseline vs 2024-2025 recent.
const BASELINE_START = "2020-01-01";
const BASELINE_END   = "2020-12-31";
const CURRENT_START  = "2024-01-01";
const CURRENT_END    = "2025-12-31";

/**
 * Run the SAR-derived shoreline change analysis for a given location.
 * Returns aggregated erosion / accretion / net change metrics plus a
 * GEE thumbnail URL showing loss (red) and gain (teal) on SAR background.
 *
 * Algorithm:
 *  1. Filter Sentinel-1 GRD IW VV DESCENDING passes to the bbox.
 *  2. Build mean composites for baseline and current periods.
 *  3. Apply fixed -15 dB threshold to segment land/water.
 *  4. Compute pixel-wise difference to derive erosion / accretion masks.
 *  5. Convert pixel counts to m² area and linear shoreline displacement.
 *  6. Generate a false-colour thumbnail: SAR grey + red erosion + teal accretion.
 */
export async function analyseCoastline(loc: Location): Promise<CoastlineMetrics> {
  const [lonMin, latMin, lonMax, latMax] = loc.bbox;
  const region = ee.Geometry.Rectangle([lonMin, latMin, lonMax, latMax]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function periodComposite(start: string, end: string): any {
    const base = ee.ImageCollection("COPERNICUS/S1_GRD")
      .filterBounds(region)
      .filterDate(start, end)
      .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
      .filter(ee.Filter.eq("instrumentMode", "IW"))
      .select("VV");

    // Prefer DESCENDING passes — matches original Streamlit that confirmed
    // real coverage for Niue. Fall back to all orbits if descending is empty.
    const descCol = base.filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"));
    const col = ee.ImageCollection(
      ee.Algorithms.If(descCol.size().gt(0), descCol, base)
    );

    // If still empty, return constant -30 dB (water) — 1 band, no crash.
    const composite = ee.Algorithms.If(
      col.size().gt(0),
      col.mean(),
      ee.Image.constant(-30).rename("VV")
    );

    return ee.Image(composite).clip(region);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function landMask(image: any): any {
    // -15 dB is a reliable land/water boundary for tropical Pacific coastlines.
    return image.gt(-15).rename("land");
  }

  const baselineComposite = periodComposite(BASELINE_START, BASELINE_END);
  const currentComposite  = periodComposite(CURRENT_START,  CURRENT_END);

  const baseline = landMask(baselineComposite);
  const current  = landMask(currentComposite);

  // Erosion: was land (1), now water (0)
  const erosionMask   = baseline.eq(1).and(current.eq(0));
  // Accretion: was water (0), now land (1)
  const accretionMask = baseline.eq(0).and(current.eq(1));
  // Stable: no change
  const stableMask    = baseline.eq(current);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function countPixels(mask: any): Promise<number> {
    return new Promise((resolve, reject) => {
      mask.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: region,
        scale: 10,
        maxPixels: 1e9,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).evaluate((result: any, err: string) => {
        if (err) return reject(new Error(err));
        resolve(result?.land ?? 0);
      });
    });
  }

  // Generate false-colour thumbnail: SAR grey background + red erosion + teal accretion.
  // Mosaic order: background first, then coloured masks paint on top.
  function buildMapImage() {
    const sarViz = currentComposite.visualize({ bands: ["VV"], min: -25, max: 0, palette: ["#0D1B2A", "#2a4a6b", "#7ab3c8"] });
    const erosionViz   = erosionMask.selfMask().visualize({ palette: ["#E05B4B"] });
    const accretionViz = accretionMask.selfMask().visualize({ palette: ["#4CB9C0"] });
    return ee.ImageCollection([sarViz, erosionViz, accretionViz]).mosaic();
  }

  function getThumbUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      buildMapImage().getThumbURL(
        { region, dimensions: 800, format: "jpg" },
        (url: string, err: string) => {
          if (err) return reject(new Error(err));
          resolve(url);
        }
      );
    });
  }

  const [erosionPx, accretionPx, stablePx, mapImageUrl] = await Promise.all([
    countPixels(erosionMask),
    countPixels(accretionMask),
    countPixels(stableMask),
    getThumbUrl().catch(() => ""),  // map image is best-effort — don't block metrics
  ]);

  const totalPx = erosionPx + accretionPx + stablePx;

  // Area-based metrics (m²)
  const pixelArea    = 100; // 10 m × 10 m
  const erosion_m2   = erosionPx   * pixelArea;
  const accretion_m2 = accretionPx * pixelArea;

  // Linear shoreline displacement estimate: area change ÷ coastal perimeter
  const coastLengthM  = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;
  const erosion_m     = erosion_m2   / Math.max(coastLengthM, 1);
  const accretion_m   = accretion_m2 / Math.max(coastLengthM, 1);
  const net_change_m  = accretion_m - erosion_m;
  const stable_pct    = totalPx > 0 ? (stablePx / totalPx) * 100 : 0;

  return {
    erosion_m:    Math.round(erosion_m    * 10) / 10,
    accretion_m:  Math.round(accretion_m  * 10) / 10,
    net_change_m: Math.round(net_change_m * 10) / 10,
    stable_pct:   Math.round(stable_pct   * 10) / 10,
    erosion_m2:   Math.round(erosion_m2),
    accretion_m2: Math.round(accretion_m2),
    period_start: "2020",
    period_end:   "2024–2025",
    mapImageUrl,
  };
}
