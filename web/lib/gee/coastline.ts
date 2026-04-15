import ee from "@google/earthengine";
import { type Location } from "@/lib/locations";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

const BASELINE_START = "2020-01-01";
const BASELINE_END   = "2020-12-31";
const CURRENT_START  = "2025-01-01";
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
      .filter(ee.Filter.eq("instrumentMode", "IW"))
      .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
      .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
      .select("VV")
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
 * Returns erosion / accretion / stable metrics via 3 parallel GEE reduceRegion calls.
 * Matches the Streamlit Python logic: lt(-15) water mask, pixelArea() multiplication.
 */
export async function analyseCoastline(loc: Location): Promise<CoastlineMetrics> {
  const { region, baselineComposite, currentComposite } = buildRegionAndCollections(loc);

  // Water mask: VV < -15 dB = water (matches Streamlit logic exactly)
  const waterBaseline = baselineComposite.lt(-15);
  const waterCurrent  = currentComposite.lt(-15);

  // Binary masks — no pixelArea() in the GEE graph, keeps compute graph minimal
  const erosionMask   = waterBaseline.eq(0).and(waterCurrent.eq(1)).rename("erosion");
  const accretionMask = waterBaseline.eq(1).and(waterCurrent.eq(0)).rename("accretion");
  const stableMask    = waterBaseline.eq(0).and(waterCurrent.eq(0)).rename("stable");

  // Single multiband reduceRegion — one GEE round-trip, composites computed once
  // scale=100m uses GEE's 100m pyramid (~37k pixels for Niue) — completes in seconds
  const PIXEL_AREA_M2 = 100 * 100; // 100m × 100m per pixel
  const counts = await new Promise<{ erosion: number; accretion: number; stable: number }>(
    (resolve, reject) => {
      erosionMask.addBands(accretionMask).addBands(stableMask)
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: region,
          scale: 100,
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
  const erosion_m2   = counts.erosion   * PIXEL_AREA_M2;
  const accretion_m2 = counts.accretion * PIXEL_AREA_M2;
  const totalM2      = (counts.erosion + counts.accretion + counts.stable) * PIXEL_AREA_M2;

  const coastLengthM = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;
  const erosion_m    = erosion_m2  / Math.max(coastLengthM, 1);
  const accretion_m  = accretion_m2 / Math.max(coastLengthM, 1);
  const net_change_m = accretion_m - erosion_m;
  const stable_pct   = totalM2 > 0 ? ((counts.stable * PIXEL_AREA_M2) / totalM2) * 100 : 0;

  return {
    erosion_m:    Math.round(erosion_m    * 10) / 10,
    accretion_m:  Math.round(accretion_m  * 10) / 10,
    net_change_m: Math.round(net_change_m * 10) / 10,
    stable_pct:   Math.round(stable_pct   * 10) / 10,
    erosion_m2:   Math.round(erosion_m2),
    accretion_m2: Math.round(accretion_m2),
    period_start: "2020",
    period_end:   "2025",
    mapImageUrl:  "",  // loaded separately via /api/map-thumb
  };
}

/**
 * Generates the false-colour thumbnail URL (SAR grey + red/teal overlay).
 * Called separately from the metrics to avoid timeout on Hobby plan.
 */
export async function generateMapThumb(loc: Location): Promise<string> {
  const { region, baselineComposite, currentComposite } = buildRegionAndCollections(loc);

  const waterBaseline = baselineComposite.lt(-15);
  const waterCurrent  = currentComposite.lt(-15);
  const erosionMask   = waterBaseline.eq(0).and(waterCurrent.eq(1));  // was land, now water
  const accretionMask = waterBaseline.eq(1).and(waterCurrent.eq(0));  // was water, now land

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
