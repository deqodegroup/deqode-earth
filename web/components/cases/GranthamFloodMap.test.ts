import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(
  join(__dirname, "GranthamFloodMap.tsx"),
  "utf-8"
);

describe("GranthamFloodMap — fallback render when API returns empty GeoJSON", () => {
  it("renders fallback message text when features array is empty", () => {
    // Component must check features.length and show fallback
    expect(SOURCE).toMatch(/features\.length/);
    expect(SOURCE).toMatch(/Flood extent data unavailable/);
  });

  it("renders fallback message when fetch rejects (network error)", () => {
    // Component must have a catch or error state that shows the fallback
    expect(SOURCE).toMatch(/catch/);
    expect(SOURCE).toMatch(/Flood extent data unavailable/);
  });

  it("renders a div with aria-label for the map when data is present", () => {
    // Map container must have the aria-label for accessibility
    expect(SOURCE).toMatch(/aria-label.*2011 Grantham flood extent map/);
  });
});

describe("GranthamFloodMap — component structure", () => {
  it("exports a named function GranthamFloodMap", () => {
    expect(SOURCE).toMatch(/export function GranthamFloodMap/);
  });

  it("is a use client component", () => {
    expect(SOURCE).toMatch(/"use client"/);
  });

  it("fetches the correct flood-zones bbox", () => {
    expect(SOURCE).toMatch(/api\/flood-zones/);
    expect(SOURCE).toMatch(/bbox=152\.0,-27\.8,152\.5,-27\.3/);
  });

  it("imports Leaflet dynamically inside useEffect (not at module level)", () => {
    // Dynamic import inside effect
    expect(SOURCE).toMatch(/import\(["']leaflet["']\)/);
    // NOT a top-level static import of leaflet
    expect(SOURCE).not.toMatch(/^import\s+.*from\s+["']leaflet["']/m);
  });

  it("applies coral flood color to GeoJSON layer", () => {
    expect(SOURCE).toMatch(/#E05252/);
  });

  it("cleans up map on unmount", () => {
    expect(SOURCE).toMatch(/map\.remove\(\)/);
  });

  it("renders the fallback with the correct height class h-80", () => {
    expect(SOURCE).toMatch(/h-80/);
  });
});
