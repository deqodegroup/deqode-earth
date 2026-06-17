import { describe, it, expect } from "vitest"
import { buildOceanSummary, type OceanMetricRow } from "./metrics"

describe("buildOceanSummary", () => {
  it("returns unknown trend when no rows exist", () => {
    const summary = buildOceanSummary([])
    expect(summary.sst.latestValue).toBeNull()
    expect(summary.sst.trend.direction).toBe("unknown")
    expect(summary.ph.trend.direction).toBe("unknown")
  })

  it("returns unknown trend with a single row but still reports latest value", () => {
    const rows: OceanMetricRow[] = [
      { metricType: "sst", recordedDate: "2026-06-01", value: 28.4, unit: "celsius" },
    ]
    const summary = buildOceanSummary(rows)
    expect(summary.sst.latestValue).toBe(28.4)
    expect(summary.sst.trend.direction).toBe("unknown")
  })

  it("detects a rising SST trend", () => {
    const rows: OceanMetricRow[] = [
      { metricType: "sst", recordedDate: "2026-05-18", value: 27.8, unit: "celsius" },
      { metricType: "sst", recordedDate: "2026-06-01", value: 28.6, unit: "celsius" },
    ]
    const summary = buildOceanSummary(rows)
    expect(summary.sst.latestValue).toBe(28.6)
    expect(summary.sst.trend.direction).toBe("rising")
    expect(summary.sst.trend.deltaValue).toBeCloseTo(0.8)
    expect(summary.sst.trend.comparedTo).toBe("2026-05-18")
  })

  it("detects a falling pH trend (acidifying)", () => {
    const rows: OceanMetricRow[] = [
      { metricType: "ph", recordedDate: "2025-06-01", value: 8.09, unit: "ph" },
      { metricType: "ph", recordedDate: "2026-06-01", value: 8.07, unit: "ph" },
    ]
    const summary = buildOceanSummary(rows)
    expect(summary.ph.trend.direction).toBe("falling")
    expect(summary.ph.trend.deltaValue).toBeCloseTo(-0.02)
  })

  it("treats tiny deltas as stable rather than rising or falling", () => {
    const rows: OceanMetricRow[] = [
      { metricType: "sst", recordedDate: "2026-05-18", value: 28.40, unit: "celsius" },
      { metricType: "sst", recordedDate: "2026-06-01", value: 28.42, unit: "celsius" },
    ]
    const summary = buildOceanSummary(rows)
    expect(summary.sst.trend.direction).toBe("stable")
  })

  it("sorts unordered rows correctly before computing trend", () => {
    const rows: OceanMetricRow[] = [
      { metricType: "sst", recordedDate: "2026-06-01", value: 28.6, unit: "celsius" },
      { metricType: "sst", recordedDate: "2026-05-18", value: 27.8, unit: "celsius" },
    ]
    const summary = buildOceanSummary(rows)
    expect(summary.sst.latestDate).toBe("2026-06-01")
    expect(summary.sst.trend.comparedTo).toBe("2026-05-18")
  })

  it("computes sst and ph independently from a mixed row set", () => {
    const rows: OceanMetricRow[] = [
      { metricType: "sst", recordedDate: "2026-05-18", value: 27.8, unit: "celsius" },
      { metricType: "sst", recordedDate: "2026-06-01", value: 28.6, unit: "celsius" },
      { metricType: "ph", recordedDate: "2025-06-01", value: 8.09, unit: "ph" },
      { metricType: "ph", recordedDate: "2026-06-01", value: 8.07, unit: "ph" },
    ]
    const summary = buildOceanSummary(rows)
    expect(summary.sst.trend.direction).toBe("rising")
    expect(summary.ph.trend.direction).toBe("falling")
  })
})
