import ee from "@google/earthengine";
import { type Location } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

// Sentinel-2 SR — confirmed coverage across all 8 Pacific SIDS
// Sentinel-1 SAR has ZERO coverage over Niue, Tuvalu, Kiribati, Marshall Islands
const BASELINE_START = "2019-01-01";
const BASELINE_END   = "2020-12-31";  // 2-year median for stable cloud-free composite
const CURRENT_START  = "2023-01-01";
const CURRENT_END    = "2025-03-31";  // 2-year current

const SCALE       = 30;               // 30m — fast, accurate for island-scale change
const PIXEL_AREA  = SCALE * SCALE;    // m² per pixel (hardcoded avoids ee.Image.pixelArea() overhead)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRegionAndComposites(loc: Location): { region: any; baseline: any; current: any } {
  const [lonMin, latMin, lonMax, latMax] = loc.bbox;
  const region = ee.Geometry.Rectangle([lonMin, latMin, lonMax, latMax]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ndwiComposite(start: string, end: string): any {
    return ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterBounds(region)
      .filterDate(start, end)
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
      .map((img: any) => img.normalizedDifference(["B3", "B8"]).rename("ndwi"))  // eslint-disable-line @typescript-eslint/no-explicit-any
      .median();
  }

  return {
    region,
    baseline: ndwiComposite(BASELINE_START, BASELINE_END),
    current:  ndwiComposite(CURRENT_START,  CURRENT_END),
  };
}

/**
 * Coastal change via Sentinel-2 NDWI.
 * NDWI = (Green B3 - NIR B8) / (Green B3 + NIR B8)
 * > 0 = water,  ≤ 0 = land
 * Single multiband reduceRegion — one GEE round-trip.
 */
export async function analyseCoastline(loc: Location): Promise<CoastlineMetrics> {
  const { region, baseline, current } = buildRegionAndComposites(loc);

  const waterBaseline = baseline.gt(0);  // NDWI > 0 = water
  const waterCurrent  = current.gt(0);

  // Land→water = erosion | water→land = accretion | land→land = stable
  const erosionMask   = waterBaseline.eq(0).and(waterCurrent.eq(1)).rename("erosion");
  const accretionMask = waterBaseline.eq(1).and(waterCurrent.eq(0)).rename("accretion");
  const stableMask    = waterBaseline.eq(0).and(waterCurrent.eq(0)).rename("stable");

  const counts = await new Promise<{ erosion: number; accretion: number; stable: number }>(
    (resolve, reject) => {
      erosionMask.addBands(accretionMask).addBands(stableMask)
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: region,
          scale:     SCALE,
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

  const [lonMin, latMin, lonMax, latMax] = loc.bbox;
  const erosion_m2   = counts.erosion   * PIXEL_AREA;
  const accretion_m2 = counts.accretion * PIXEL_AREA;
  const totalM2      = (counts.erosion + counts.accretion + counts.stable) * PIXEL_AREA;

  const coastLengthM = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;
  const erosion_m    = erosion_m2   / Math.max(coastLengthM, 1);
  const accretion_m  = accretion_m2 / Math.max(coastLengthM, 1);
  const net_change_m = accretion_m  - erosion_m;
  const stable_pct   = totalM2 > 0 ? ((counts.stable * PIXEL_AREA) / totalM2) * 100 : 0;

  return {
    erosion_m:    Math.round(erosion_m    * 10) / 10,
    accretion_m:  Math.round(accretion_m  * 10) / 10,
    net_change_m: Math.round(net_change_m * 10) / 10,
    stable_pct:   Math.round(stable_pct   * 10) / 10,
    erosion_m2:   Math.round(erosion_m2),
    accretion_m2: Math.round(accretion_m2),
    period_start: "2019",
    period_end:   "2025",
    mapImageUrl:  "",
  };
}

/**
 * False-colour change map — true-colour Sentinel-2 base + red erosion + teal accretion overlay.
 */
export async function generateMapThumb(loc: Location): Promise<string> {
  const { region, baseline, current } = buildRegionAndComposites(loc);

  const waterBaseline = baseline.gt(0);
  const waterCurrent  = current.gt(0);
  const erosionMask   = waterBaseline.eq(0).and(waterCurrent.eq(1));
  const accretionMask = waterBaseline.eq(1).and(waterCurrent.eq(0));

  // True-colour RGB base from Sentinel-2 current composite
  const s2Current = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(region)
    .filterDate(CURRENT_START, CURRENT_END)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    .median()
    .select(["B4", "B3", "B2"]);  // RGB

  const baseViz      = s2Current.visualize({ bands: ["B4", "B3", "B2"], min: 0, max: 3000 });
  const erosionViz   = erosionMask.selfMask().visualize({ palette: ["#E05B4B"] });
  const accretionViz = accretionMask.selfMask().visualize({ palette: ["#4CB9C0"] });
  const mapImage     = ee.ImageCollection([baseViz, erosionViz, accretionViz]).mosaic();

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
