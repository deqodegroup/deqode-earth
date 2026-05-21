import { describe, it, expect } from "vitest";
import {
  REGIONS,
  REGION_LIST,
  getRegionsBySubRegion,
  getRegion,
  SUB_REGIONS,
} from "./regions";

describe("regions", () => {
  it("includes all 8 original SIDS", () => {
    const sids = REGION_LIST.filter((r) => r.regionType === "sids");
    expect(sids.length).toBeGreaterThanOrEqual(8);
  });

  it("includes brisbane as urban_flood", () => {
    expect(REGIONS["brisbane"].regionType).toBe("urban_flood");
  });

  it("includes grantham as managed_retreat", () => {
    expect(REGIONS["grantham"].regionType).toBe("managed_retreat");
  });

  it("getRegionsBySubRegion groups pacific islands correctly", () => {
    const polynesia = getRegionsBySubRegion("polynesia");
    const slugs = polynesia.map((r) => r.slug);
    expect(slugs).toContain("niue");
    expect(slugs).toContain("tuvalu");
  });

  it("getRegion returns undefined for unknown slug", () => {
    expect(getRegion("not-a-place")).toBeUndefined();
  });

  it("all SIDS have bbox defined", () => {
    REGION_LIST.filter((r) => r.regionType === "sids").forEach((r) => {
      expect(r.bbox).toHaveLength(4);
    });
  });
});
