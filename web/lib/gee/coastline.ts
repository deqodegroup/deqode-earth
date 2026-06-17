import ee from "@google/earthengine";
import { type Region } from "@/lib/regions";
import { getAnalysisPeriod } from "@/lib/analysis-period";
import { type CoastlineMetrics } from "@/components/modules/coastline/MetricCards";

type EeImage = any;
type EeGeometry = any;
type SlrExposure = Record<"slr_pct_1m" | "slr_pct_2m" | "slr_pct_5m", number | null>;

function evaluate<T>(eeObject: { evaluate: (success: (value: T) => void, failure: (error: unknown) => void) => void }) {
  return new Promise<T>((resolve, reject) => {
    eeObject.evaluate(resolve, reject);
  });
}

function getAnalysisSettings(region: Region) {
  const lonRange = region.bbox[2] - region.bbox[0];
  const narrowAtoll = lonRange < 0.35;

  return {
    scale: narrowAtoll ? 10 : 30,
    minAreaM2: narrowAtoll ? 1000 : 5000,
  };
}

function mndwiComposite(year: number, aoi: EeGeometry): EeImage {
  return ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(aoi)
    .filterDate(`${year}-01-01`, `${year}-12-31`)
    .filter(ee.Filter.calendarRange(5, 10, "month"))
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 15))
    .select(["B3", "B11"])
    .map((image: EeImage) =>
      image.normalizedDifference(["B3", "B11"]).rename("mndwi")
    )
    .median();
}

function otsuThreshold(counts: number[], centers: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  let bestThreshold = centers[0] ?? 0;
  let bestBss = 0;
  let weightBg = 0;
  let meanBgWeighted = 0;

  for (let i = 0; i < counts.length; i += 1) {
    const weight = counts[i] / total;
    weightBg += weight;
    meanBgWeighted += weight * centers[i];

    const weightFg = 1 - weightBg;
    if (weightBg === 0) continue;
    if (weightFg === 0) break;

    const fgCounts = counts.slice(i + 1);
    const fgCenters = centers.slice(i + 1);
    const fgTotal = fgCounts.reduce((sum, count) => sum + count, 0);
    const meanFg = fgTotal > 0
      ? fgCounts.reduce((sum, count, idx) => sum + count * fgCenters[idx], 0) / fgTotal
      : 0;
    const meanBg = meanBgWeighted / weightBg;
    const bss = weightBg * weightFg * (meanBg - meanFg) ** 2;

    if (bss > bestBss) {
      bestBss = bss;
      bestThreshold = centers[i];
    }
  }

  return bestThreshold;
}

function shouldUseOtsuFallback(threshold: number, totalCount: number) {
  return totalCount < 100 || threshold < -0.8 || threshold > 0.8;
}

async function computeWaterMask(mndwiImage: EeImage, aoi: EeGeometry, scale: number): Promise<EeImage> {
  const histResult = await evaluate<Record<string, { histogram?: number[]; bucketMeans?: number[] }>>(
    mndwiImage.reduceRegion({
      reducer: ee.Reducer.histogram(256),
      geometry: aoi,
      scale,
      maxPixels: 1e9,
    })
  );

  const hist = histResult?.mndwi;
  const counts = hist?.histogram ?? [];
  const centers = hist?.bucketMeans ?? [];

  if (counts.length === 0 || centers.length === 0) {
    return mndwiImage.gt(0);
  }

  const total = counts.reduce((sum, count) => sum + count, 0);
  const threshold = otsuThreshold(counts, centers);

  return shouldUseOtsuFallback(threshold, total)
    ? mndwiImage.gt(0)
    : mndwiImage.gt(threshold);
}

function applyMinAreaFilter(waterMask: EeImage, minAreaM2: number) {
  const connectedCount = waterMask.connectedPixelCount(1024, true);
  const objectArea = connectedCount.multiply(ee.Image.pixelArea());

  return waterMask.updateMask(objectArea.gte(minAreaM2));
}

async function computeSlrExposure(aoi: EeGeometry) {
  const srtm = ee.Image("USGS/SRTMGL1_003").select("elevation");
  const land = srtm.gt(0);
  const totalResult = await evaluate<Record<string, number>>(
    land.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi,
      scale: 30,
      maxPixels: 1e9,
    })
  );
  const totalLand = totalResult?.elevation || 1;

  const result: SlrExposure = {
    slr_pct_1m: null,
    slr_pct_2m: null,
    slr_pct_5m: null,
  };

  for (const threshold of [1, 2, 5] as const) {
    const exposed = srtm.lte(threshold).and(land);
    const exposedResult = await evaluate<Record<string, number>>(
      exposed.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale: 30,
        maxPixels: 1e9,
      })
    );
    const count = exposedResult?.elevation || 0;
    result[`slr_pct_${threshold}m`] = Math.round((count / Math.max(totalLand, 1)) * 1000) / 10;
  }

  return result;
}

async function computeCmip6TempDelta(aoi: EeGeometry) {
  async function meanTemp(start: string, end: string) {
    const result = await evaluate<Record<string, number>>(
      ee.ImageCollection("NASA/GDDP-CMIP6")
        .filter(ee.Filter.eq("model", "ACCESS-CM2"))
        .filter(ee.Filter.eq("scenario", "ssp585"))
        .filterDate(start, end)
        .select("tas")
        .mean()
        .reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: aoi,
          scale: 27500,
          maxPixels: 1e9,
        })
    );

    return result?.tas ?? null;
  }

  const near = await meanTemp("2020-01-01", "2030-12-31");
  const far = await meanTemp("2090-01-01", "2100-12-31");

  if (near == null || far == null) return null;
  return Math.round((far - near) * 10) / 10;
}

async function buildChangeMasks(region: Region) {
  const period = getAnalysisPeriod();
  const { scale, minAreaM2 } = getAnalysisSettings(region);
  const aoi = ee.Geometry.Rectangle(region.bbox);

  const baseline = mndwiComposite(period.baselineYear, aoi);
  const current = mndwiComposite(period.currentYear, aoi);
  const waterBaseline = await computeWaterMask(baseline, aoi, scale);
  const waterCurrent = await computeWaterMask(current, aoi, scale);
  const waterBaselineFiltered = applyMinAreaFilter(waterBaseline.selfMask(), minAreaM2).unmask(0);
  const waterCurrentFiltered = applyMinAreaFilter(waterCurrent.selfMask(), minAreaM2).unmask(0);

  return {
    period,
    aoi,
    scale,
    erosionMask: waterBaselineFiltered.eq(0).and(waterCurrentFiltered.eq(1)),
    accretionMask: waterBaselineFiltered.eq(1).and(waterCurrentFiltered.eq(0)),
    stableMask: waterBaselineFiltered.eq(0).and(waterCurrentFiltered.eq(0)),
  };
}

export async function analyseCoastline(region: Region): Promise<CoastlineMetrics> {
  const { period, aoi, scale, erosionMask, accretionMask, stableMask } = await buildChangeMasks(region);
  const counts = await evaluate<Record<string, number>>(
    erosionMask.rename("erosion")
      .addBands(accretionMask.rename("accretion"))
      .addBands(stableMask.rename("stable"))
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale,
        maxPixels: 1e9,
      })
  );

  const erosionCount = counts?.erosion || 0;
  const accretionCount = counts?.accretion || 0;
  const stableCount = counts?.stable || 0;
  const pixelArea = scale * scale;
  const erosionM2 = erosionCount * pixelArea;
  const accretionM2 = accretionCount * pixelArea;
  const stableM2 = stableCount * pixelArea;
  const totalM2 = erosionM2 + accretionM2 + stableM2;
  const [lonMin, latMin, lonMax, latMax] = region.bbox;
  const coastLengthM = Math.sqrt((lonMax - lonMin) ** 2 + (latMax - latMin) ** 2) * 111_000;
  const erosionM = erosionM2 / Math.max(coastLengthM, 1);
  const accretionM = accretionM2 / Math.max(coastLengthM, 1);
  let slr: SlrExposure = { slr_pct_1m: null, slr_pct_2m: null, slr_pct_5m: null };
  let cmip6TempDelta: number | null = null;

  try {
    slr = await computeSlrExposure(aoi);
  } catch {
    slr = { slr_pct_1m: null, slr_pct_2m: null, slr_pct_5m: null };
  }

  try {
    cmip6TempDelta = await computeCmip6TempDelta(aoi);
  } catch {
    cmip6TempDelta = null;
  }

  return {
    erosion_m: Math.round(erosionM * 10) / 10,
    accretion_m: Math.round(accretionM * 10) / 10,
    net_change_m: Math.round((accretionM - erosionM) * 10) / 10,
    stable_pct: totalM2 > 0 ? Math.round((stableM2 / totalM2) * 1000) / 10 : 0,
    erosion_m2: Math.round(erosionM2),
    accretion_m2: Math.round(accretionM2),
    period_start: String(period.baselineYear),
    period_end: String(period.currentYear),
    algorithm: "MNDWI+Otsu",
    mapImageUrl: "",
    ...slr,
    cmip6_temp_delta_c: cmip6TempDelta,
  };
}

export async function generateChangeTileUrl(region: Region) {
  const { aoi, erosionMask, accretionMask } = await buildChangeMasks(region);
  const classified = erosionMask.multiply(1)
    .add(accretionMask.multiply(2))
    .selfMask();

  const mapId = classified.getMapId({
    min: 1,
    max: 2,
    palette: ["E05B4B", "4CB9C0"],
    opacity: 0.85,
  });

  const tileUrl = `https://earthengine.googleapis.com/map/${mapId.mapid}/{z}/{x}/{y}?token=${mapId.token}`;

  return {
    tileUrl,
    bounds: region.bbox,
    aoi,
  };
}
