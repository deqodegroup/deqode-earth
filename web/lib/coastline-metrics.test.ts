import { describe, it, expect } from "vitest";
import type { CoastlineMetrics } from "@/components/modules/coastline/MetricCards";
import { otsuFallback } from "./coastline-metrics";

describe("CoastlineMetrics type", () => {
  it("accepts the legacy 9-field shape", () => {
    const legacy: CoastlineMetrics = {
      erosion_m: 1.2,
      accretion_m: 0.4,
      net_change_m: -0.8,
      stable_pct: 92.1,
      erosion_m2: 12000,
      accretion_m2: 4000,
      period_start: "2019",
      period_end: "2024",
      mapImageUrl: "",
    };
    expect(legacy.erosion_m).toBe(1.2);
  });

  it("accepts the extended shape with algorithm + slr_pct_* + cmip6_temp_delta_c", () => {
    const extended: CoastlineMetrics = {
      erosion_m: 1.2,
      accretion_m: 0.4,
      net_change_m: -0.8,
      stable_pct: 92.1,
      erosion_m2: 12000,
      accretion_m2: 4000,
      period_start: "2019",
      period_end: "2024",
      mapImageUrl: "",
      algorithm: "MNDWI+Otsu",
      slr_pct_1m: 12.4,
      slr_pct_2m: 28.1,
      slr_pct_5m: 61.8,
      cmip6_temp_delta_c: 3.4,
    };
    expect(extended.algorithm).toBe("MNDWI+Otsu");
    expect(extended.slr_pct_1m).toBe(12.4);
    expect(extended.cmip6_temp_delta_c).toBe(3.4);
  });

  it("allows slr_pct_* and cmip6_temp_delta_c to be null (graceful fallback)", () => {
    const nullable: CoastlineMetrics = {
      erosion_m: 0, accretion_m: 0, net_change_m: 0, stable_pct: 100,
      erosion_m2: 0, accretion_m2: 0, period_start: "2019", period_end: "2024",
      mapImageUrl: "",
      slr_pct_1m: null,
      slr_pct_2m: null,
      slr_pct_5m: null,
      cmip6_temp_delta_c: null,
    };
    expect(nullable.cmip6_temp_delta_c).toBeNull();
  });
});

describe("otsuFallback", () => {
  it("returns true when histogram count is below 100", () => {
    expect(otsuFallback(0.1, 50)).toBe(true);
  });

  it("returns true when threshold is below -0.8", () => {
    expect(otsuFallback(-0.95, 5000)).toBe(true);
  });

  it("returns true when threshold is above 0.8", () => {
    expect(otsuFallback(0.9, 5000)).toBe(true);
  });

  it("returns false when threshold is within range and count is sufficient", () => {
    expect(otsuFallback(-0.3, 5000)).toBe(false);
    expect(otsuFallback(0.0, 5000)).toBe(false);
    expect(otsuFallback(0.5, 5000)).toBe(false);
  });
});
