import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(
  join(__dirname, "CoastlineModule.tsx"),
  "utf-8"
);

describe("CoastlineModule spec table", () => {
  it("references the MNDWI+Otsu algorithm in the mission parameters or spec table", () => {
    expect(SOURCE).toMatch(/MNDWI\+Otsu/);
  });

  it("shows the dry-season label", () => {
    expect(SOURCE).toMatch(/Dry \(May.?Oct\)/);
  });

  it("sensor badge no longer reads as 'S2 · NDWI' (must be S2 · MNDWI+Otsu)", () => {
    expect(SOURCE).not.toMatch(/S2 · NDWI ·/);
  });
});
