import { describe, it, expect } from "vitest";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS, GOOGLE_TILE_OPTIONS } from "./map-config";

describe("map-config", () => {
  it("default center is Asia-Pacific", () => {
    expect(ASIA_PACIFIC_DEFAULT.center).toEqual([10, 145]);
    expect(ASIA_PACIFIC_DEFAULT.zoom).toBe(4);
  });

  it("Google Maps road tile URL is correct format", () => {
    expect(TILE_URLS.googleMaps).toContain("mt{s}.google.com");
    expect(TILE_URLS.googleMaps).toContain("lyrs=m");
  });

  it("Google Maps satellite tile URL is correct format", () => {
    expect(TILE_URLS.googleSatellite).toContain("mt{s}.google.com");
    expect(TILE_URLS.googleSatellite).toContain("lyrs=y");
  });

  it("Google tile options include all 4 subdomains", () => {
    expect(GOOGLE_TILE_OPTIONS.subdomains).toEqual(["0", "1", "2", "3"]);
  });
});
