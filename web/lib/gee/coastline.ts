import ee from "@google/earthengine";
import { type Location } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

// Wide windows to maximise S1 coverage over small Pacific islands.
// Counts are returned in the response so we can confirm data was found.
const BASELINE_START = "2019-01-01";
const BASELINE_END   = "2021-12-31";
const CURRENT_START  = "2022-01-01";
const CURRENT_END    = "2025-12-31";

/**
 * Run the SAR-derived shoreline change analysis for a given location.
 *
 * Algorithm:
 *  1. Filter Sentinel-1 GRD VV passes to the bbox — no mode/orbit restriction
 *     so we catch IW, EW, and SM passes over remote Pacific islands.
 *  2. Build mean composites for baseline and current periods.
 *  3. Apply fixed -15 dB threshold to segment land/water.
 *  4. Compute erosion / accretion masks and pixel counts.
 *  5. Generate a false-colour GEE thumbnail (SAR grey + red/teal overlay).
 */
export async function analyseCoastline(loc: Location): Promise<CoastlineMetrics> {
  const [lonMin, latMin, lonMax, latMax] = loc.bbox;
  const region = ee.Geometry.Rectangle([lonMin, latMin, lonMax, latMax]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildCollection(start: string, end: string): any {
    // No instrumentMode or orbitProperties_pass filter — accept whatever
    // Sentinel-1 passes exist over this small island.
    return ee.ImageCollection("COPERNICUS/S1_GRD")
      .filterBounds(region)
      .filterDate(start, end)
      .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
      .select("VV");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function safeComposite(col: any): any {
    // If empty, fall back to constant -30 dB (water) so downstream .gt()
    // always gets a 1-band image. Returns a flag image too so we can detect it.
    return ee.Image(
      ee.Algorithms.If(
        col.size().gt(0),
        col.mean(),
        ee.Image.constant(-30).rename("VV")
      )
    ).clip(region);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getCollectionSize(col: any): Promise<number> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      col.size().evaluate((n: any, err: any) => {
        resolve(err ? 0 : (n ?? 0));
      });
    });
  }

  const baselineCol = buildCollection(BASELINE_START, BASELINE_END);
  const currentCol  = buildCollection(CURRENT_START,  CURRENT_END);

  // Get counts first so we can surface data availability in the response
  const [baselineCount, currentCount] = await Promise.all([
    getCollectionSize(baselineCol),
    getCollectionSize(currentCol),
  ]);

  const baselineComposite = safeComposite(baselineCol);
  const currentComposite  = safeComposite(currentCol);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function landMask(image: any): any {
    return image.gt(-15).rename("land");
  }

  const baseline = landMask(baselineComposite);
  const current  = landMask(currentComposite);

  // Erosion: was land (1), now water (0)
  const erosionMask   = baseline.eq(1).and(current.eq(0));
  // Accretion: was water (0), now land (1)
  const accretionMask = baseline.eq(0).and(current.eq(1));
  // Stable
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
      }).evaluate((result: any, err: any) => {
        if (err) return reject(new Error(err));
        resolve(result?.land ?? 0);
      });
    });
  }

  // False-colour thumbnail: SAR grey background + red erosion + teal accretion
  function buildMapImage() {
    const sarViz       = currentComposite.visualize({ bands: ["VV"], min: -25, max: 0, palette: ["#0D1B2A", "#2a4a6b", "#7ab3c8"] });
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

  const [erosionPx, accretionPx, stablePx, rawMapUrl] = await Promise.all([
    countPixels(erosionMask),
    countPixels(accretionMask),
    countPixels(stableMask),
    getThumbUrl().catch(() => ""),
  ]);

  const totalPx = erosionPx + accretionPx + stablePx;

  const pixelArea    = 100; // 10 m × 10 m
  const erosion_m2   = erosionPx   * pixelArea;
  const accretion_m2 = accretionPx * pixelArea;

  const coastLengthM  = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;
  const erosion_m     = erosion_m2   / Math.max(coastLengthM, 1);
  const accretion_m   = accretion_m2 / Math.max(coastLengthM, 1);
  const net_change_m  = accretion_m - erosion_m;
  const stable_pct    = totalPx > 0 ? (stablePx / totalPx) * 100 : 0;

  // Proxy the image through our own API to avoid browser CORS on GEE URLs
  const mapImageUrl = rawMapUrl
    ? `/api/map-image?url=${encodeURIComponent(rawMapUrl)}`
    : "";

  return {
    erosion_m:      Math.round(erosion_m    * 10) / 10,
    accretion_m:    Math.round(accretion_m  * 10) / 10,
    net_change_m:   Math.round(net_change_m * 10) / 10,
    stable_pct:     Math.round(stable_pct   * 10) / 10,
    erosion_m2:     Math.round(erosion_m2),
    accretion_m2:   Math.round(accretion_m2),
    period_start:   "2019–2021",
    period_end:     "2022–2025",
    mapImageUrl,
    baselineCount,
    currentCount,
  };
}
