import { describe, it, expect } from "vitest";
import { deriveCompareScore } from "../compare-data";
import { REGIONS } from "@/lib/regions";

describe("deriveCompareScore", () => {
  it("Brisbane: depth > 5m returns 80", () => {
    const score = deriveCompareScore(
      REGIONS["brisbane"],
      null,
      { depth_m: 6.2, source: "jrc_glofas" }
    );
    expect(score).toBe(80);
  });

  it("Brisbane: depth between 3 and 5 returns 65", () => {
    const score = deriveCompareScore(
      REGIONS["brisbane"],
      null,
      { depth_m: 4.0, source: "jrc_glofas" }
    );
    expect(score).toBe(65);
  });

  it("Brisbane: depth null returns 50 fallback", () => {
    const score = deriveCompareScore(
      REGIONS["brisbane"],
      null,
      { depth_m: null, source: "jrc_glofas" }
    );
    expect(score).toBe(50);
  });

  it("SIDS: total_displaced > 10000 returns 85", () => {
    const score = deriveCompareScore(
      REGIONS["fiji"],
      { total_displaced: 28400, trend: [], annual_avg: null },
      null
    );
    expect(score).toBe(85);
  });

  it("SIDS: total_displaced > 1000 returns 70", () => {
    const score = deriveCompareScore(
      REGIONS["tuvalu"],
      { total_displaced: 4500, trend: [], annual_avg: null },
      null
    );
    expect(score).toBe(70);
  });

  it("SIDS: null displacement returns 40 floor", () => {
    const score = deriveCompareScore(REGIONS["niue"], null, null);
    expect(score).toBe(40);
  });
});
