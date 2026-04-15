import ee from "@google/earthengine";
import { type Location } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

const BASELINE_START = "2019-01-01";
const BASELINE_END   = "2021-12-31";
const CURRENT_START  = "2022-01-01";
const CURRENT_END    = "2025-12-31";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRegionAndCollections(loc: Location): { region: any; baselineComposite: any; currentComposite: any } {
  const [lonMin, latMin, lonMax, latMax] = loc.bbox;
  const region = ee.Geometry.Rectangle([lonMin, latMin, lonMax, latMax]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildComposite(start: string, end: string): any {
    return ee.ImageCollection("COPERNICUS/S1_GRD")
      .filterBounds(region)
      .filterDate(start, end)
      .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
      .select("VV")
      .limit(20)   // cap images to keep GEE compute fast
      .mean()
      .clip(region);
  }

  return {
    region,
    baselineComposite: buildComposite(BASELINE_START, BASELINE_END),
    currentComposite:  buildComposite(CURRENT_START,  CURRENT_END),
  };
}

/**
 * Returns erosion / accretion metrics using a SINGLE GEE reduceRegion call
 * (multiband) instead of 3 separate calls — keeps latency under 60 s.
 */
export async function analyseCoastline(loc: Location): Promise<CoastlineMetrics> {
  const { region, baselineComposite, currentComposite } = buildRegionAndCollections(loc);

  const baseline = baselineComposite.gt(-15).rename("baseline");
  const current  = currentComposite.gt(-15).rename("current");

  const erosionMask   = baseline.eq(1).and(current.eq(0)).rename("erosion");
  const accretionMask = baseline.eq(0).and(current.eq(1)).rename("accretion");
  const stableMask    = baseline.eq(current).rename("stable");

  // Single multiband reduceRegion — one GEE round-trip for all three counts
  const counts = await new Promise<{ erosion: number; accretion: number; stable: number }>(
    (resolve, reject) => {
      ee.Image([erosionMask, accretionMask, stableMask])
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: region,
          scale: 30,
          maxPixels: 1e9,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).evaluate((result: any, err: any) => {
          if (err) return reject(new Error(String(err)));
          resolve({
            erosion:   result?.erosion   ?? 0,
            accretion: result?.accretion ?? 0,
            stable:    result?.stable    ?? 0,
          });
        });
    }
  );

  const [lonMin, , lonMax, latMax] = loc.bbox;
  const latMin = loc.bbox[1];
  const pixelArea   = 100;
  const erosion_m2  = counts.erosion   * pixelArea;
  const accretion_m2 = counts.accretion * pixelArea;
  const totalPx     = counts.erosion + counts.accretion + counts.stable;

  const coastLengthM = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;
  const erosion_m    = erosion_m2  / Math.max(coastLengthM, 1);
  const accretion_m  = accretion_m2 / Math.max(coastLengthM, 1);
  const net_change_m = accretion_m - erosion_m;
  const stable_pct   = totalPx > 0 ? (counts.stable / totalPx) * 100 : 0;

  return {
    erosion_m:    Math.round(erosion_m    * 10) / 10,
    accretion_m:  Math.round(accretion_m  * 10) / 10,
    net_change_m: Math.round(net_change_m * 10) / 10,
    stable_pct:   Math.round(stable_pct   * 10) / 10,
    erosion_m2:   Math.round(erosion_m2),
    accretion_m2: Math.round(accretion_m2),
    period_start: "2019–2021",
    period_end:   "2022–2025",
    mapImageUrl:  "",  // loaded separately via /api/map-thumb
  };
}

/**
 * Generates the false-colour thumbnail URL (SAR grey + red/teal overlay).
 * Called separately from the metrics to avoid timeout on Hobby plan.
 */
export async function generateMapThumb(loc: Location): Promise<string> {
  const { region, baselineComposite, currentComposite } = buildRegionAndCollections(loc);

  const baseline = baselineComposite.gt(-15);
  const current  = currentComposite.gt(-15);
  const erosionMask   = baseline.eq(1).and(current.eq(0));
  const accretionMask = baseline.eq(0).and(current.eq(1));

  const sarViz       = currentComposite.visualize({ bands: ["VV"], min: -25, max: 0, palette: ["#0D1B2A", "#2a4a6b", "#7ab3c8"] });
  const erosionViz   = erosionMask.selfMask().visualize({ palette: ["#E05B4B"] });
  const accretionViz = accretionMask.selfMask().visualize({ palette: ["#4CB9C0"] });
  const mapImage     = ee.ImageCollection([sarViz, erosionViz, accretionViz]).mosaic();

  return new Promise((resolve, reject) => {
    mapImage.getThumbURL(
      { region, dimensions: 800, format: "jpg" },
      (url: string, err: string) => {
        if (err) return reject(new Error(String(err)));
        resolve(url);
      }
    );
  });
}
