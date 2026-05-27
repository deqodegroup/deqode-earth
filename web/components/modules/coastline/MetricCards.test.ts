import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(
  join(__dirname, "MetricCards.tsx"),
  "utf-8"
);

describe("MetricCards SLR exposure section", () => {
  it("renders an SLR exposure heading", () => {
    expect(SOURCE).toMatch(/Sea[- ]Level Rise Exposure/i);
  });

  it("conditionally renders based on slr_pct_1m being a number (not null/undefined)", () => {
    // Must guard against null AND undefined
    expect(SOURCE).toMatch(/typeof data\.slr_pct_1m === ["']number["']/);
  });

  it("labels all three SLR thresholds 1m / 2m / 5m", () => {
    expect(SOURCE).toMatch(/below 1\s?m/i);
    expect(SOURCE).toMatch(/below 2\s?m/i);
    expect(SOURCE).toMatch(/below 5\s?m/i);
  });

  it("includes an 'indicative' or 'SRTM' disclaimer (per research bias caveat)", () => {
    expect(SOURCE).toMatch(/indicative|SRTM/i);
  });
});

describe("MetricCards CMIP6 temperature card", () => {
  it("conditionally renders the CMIP6 card", () => {
    expect(SOURCE).toMatch(/data\.cmip6_temp_delta_c/);
  });

  it("renders a No data fallback for null cmip6_temp_delta_c", () => {
    expect(SOURCE).toMatch(/No data|no data/);
  });

  it("references SSP585 scenario label", () => {
    expect(SOURCE).toMatch(/SSP[- ]?585/);
  });

  it("uses °C unit", () => {
    expect(SOURCE).toMatch(/°C/);
  });
});
