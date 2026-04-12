import ee from "@google/earthengine";
import { type Location } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

// Use 2-year windows for robustness — Sentinel-1 coverage of small Pacific
// islands is sparse; single-year composites can return empty collections.
const BASELINE_START = "2019-01-01";
const BASELINE_END   = "2021-12-31";
const CURRENT_START  = "2023-01-01";
const CURRENT_END    = "2025-12-31";

/**
 * Run the SAR-derived shoreline change analysis for a given location.
 * Returns aggregated erosion / accretion / net change metrics.
 *
 * Algorithm:
 *  1. Filter Sentinel-1 GRD IW VV passes (both orbits) to the bbox.
 *  2. Build multi-year median composites for baseline and current periods.
 *  3. Apply fixed -15 dB threshold to segment land/water.
 *  4. Compute pixel-wise difference to derive erosion / accretion masks.
 *  5. Convert pixel counts to metres using the 10 m native resolution.
 */
export async function analyseCoastline(loc: Location): Promise<CoastlineMetrics> {
  const [lonMin, latMin, lonMax, latMax] = loc.bbox;
  const region = ee.Geometry.Rectangle([lonMin, latMin, lonMax, latMax]);

  function periodMedian(start: string, end: string) {
    return ee.ImageCollection("COPERNICUS/S1_GRD")
      .filterBounds(region)
      .filterDate(start, end)
      .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
      .filter(ee.Filter.eq("instrumentMode", "IW"))
      // Accept both orbits to maximise coverage over small islands
      .select("VV")
      .median()
      .clip(region);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function otsuThreshold(image: any): any {
    // Use a fixed threshold of -15 dB as a reliable land/water separator for
    // tropical Pacific coastlines (avoids needing histogram computation per scene).
    return image.gt(-15).rename("land");
  }

  const baseline = otsuThreshold(periodMedian(BASELINE_START, BASELINE_END));
  const current  = otsuThreshold(periodMedian(CURRENT_START,  CURRENT_END));

  // Erosion: was land (1), now water (0)
  const erosionMask    = baseline.eq(1).and(current.eq(0));
  // Accretion: was water (0), now land (1)
  const accretionMask  = baseline.eq(0).and(current.eq(1));
  // Stable: no change
  const stableMask     = baseline.eq(current);

  const pixelArea = 100; // 10m × 10m = 100 m²

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function countPixels(mask: any): Promise<number> {
    return new Promise((resolve, reject) => {
      mask.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: region,
        scale: 10,
        maxPixels: 1e9,
      }).evaluate((result: Record<string, number>, err: string) => {
        if (err) return reject(new Error(err));
        resolve(result?.land ?? 0);
      });
    });
  }

  const [erosionPx, accretionPx, stablePx] = await Promise.all([
    countPixels(erosionMask),
    countPixels(accretionMask),
    countPixels(stableMask),
  ]);

  const totalPx = erosionPx + accretionPx + stablePx;

  // Convert pixel counts → approximate linear shoreline displacement (metres).
  // Divide area change by the bbox coastal length estimate.
  const coastLengthM = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;

  const erosion_m    = (erosionPx    * pixelArea) / Math.max(coastLengthM, 1);
  const accretion_m  = (accretionPx  * pixelArea) / Math.max(coastLengthM, 1);
  const net_change_m = accretion_m - erosion_m;
  const stable_pct   = totalPx > 0 ? (stablePx / totalPx) * 100 : 0;

  return {
    erosion_m:    Math.round(erosion_m    * 10) / 10,
    accretion_m:  Math.round(accretion_m  * 10) / 10,
    net_change_m: Math.round(net_change_m * 10) / 10,
    stable_pct:   Math.round(stable_pct   * 10) / 10,
    period_start: "2019–2021",
    period_end:   "2023–2025",
  };
}
