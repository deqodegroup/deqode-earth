export type OceanMetricType = "sst" | "ph";

export interface OceanMetricRow {
  metricType: OceanMetricType;
  recordedDate: string;
  value: number;
  unit: string;
}

export interface OceanMetricSummary {
  latestValue: number | null;
  latestDate: string | null;
  unit: string | null;
  trend: {
    direction: "rising" | "falling" | "stable" | "unknown";
    deltaValue: number | null;
    comparedTo: string | null;
  };
}

export interface OceanSummary {
  sst: OceanMetricSummary;
  ph: OceanMetricSummary;
}

const STABLE_THRESHOLD: Record<OceanMetricType, number> = {
  sst: 0.05,
  ph: 0.005,
};

function summarizeMetric(
  rows: OceanMetricRow[],
  metricType: OceanMetricType
): OceanMetricSummary {
  const sorted = rows
    .filter((r) => r.metricType === metricType)
    .slice()
    .sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));

  if (sorted.length === 0) {
    return {
      latestValue: null,
      latestDate: null,
      unit: null,
      trend: { direction: "unknown", deltaValue: null, comparedTo: null },
    };
  }

  const latest = sorted[sorted.length - 1];

  if (sorted.length === 1) {
    return {
      latestValue: latest.value,
      latestDate: latest.recordedDate,
      unit: latest.unit,
      trend: { direction: "unknown", deltaValue: null, comparedTo: null },
    };
  }

  const earliest = sorted[0];
  const delta = latest.value - earliest.value;
  const threshold = STABLE_THRESHOLD[metricType];
  const direction =
    Math.abs(delta) < threshold ? "stable" : delta > 0 ? "rising" : "falling";

  return {
    latestValue: latest.value,
    latestDate: latest.recordedDate,
    unit: latest.unit,
    trend: {
      direction,
      deltaValue: Math.round(delta * 1000) / 1000,
      comparedTo: earliest.recordedDate,
    },
  };
}

export function buildOceanSummary(rows: OceanMetricRow[]): OceanSummary {
  return {
    sst: summarizeMetric(rows, "sst"),
    ph: summarizeMetric(rows, "ph"),
  };
}
