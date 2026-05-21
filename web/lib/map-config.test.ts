import { describe, it, expect } from "vitest";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS } from "./map-config";

describe("map-config", () => {
  it("default center is Asia-Pacific", () => {
    expect(ASIA_PACIFIC_DEFAULT.center).toEqual([10, 145]);
    expect(ASIA_PACIFIC_DEFAULT.zoom).toBe(4);
  });

  it("has satellite tile URL", () => {
    expect(TILE_URLS.satellite).toContain("arcgisonline.com");
  });

  it("has dark terrain tile URL", () => {
    expect(TILE_URLS.darkTerrain).toContain("arcgisonline.com");
  });
});
