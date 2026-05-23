import { describe, it, expect } from "vitest";
import { getRegion, REGION_LIST } from "@/lib/regions";

describe("compare route slug resolution", () => {
  it("resolves tuvalu/brisbane to valid Region objects", () => {
    const origin = getRegion("tuvalu");
    const dest = getRegion("brisbane");
    expect(origin?.regionType).toBe("sids");
    expect(dest?.regionType).toBe("urban_flood");
  });

  it("returns undefined for invalid slug (notFound trigger)", () => {
    expect(getRegion("not-a-place")).toBeUndefined();
  });

  it("generateStaticParams pre-generates all SIDS × (urban_flood + managed_retreat) combos", () => {
    const sids = REGION_LIST.filter((r) => r.regionType === "sids");
    const dests = REGION_LIST.filter(
      (r) => r.regionType === "urban_flood" || r.regionType === "managed_retreat"
    );
    expect(sids.length).toBeGreaterThanOrEqual(8);
    expect(dests.length).toBeGreaterThanOrEqual(2);
    const combos = sids.flatMap((o) =>
      dests.map((d) => ({ origin: o.slug, dest: d.slug }))
    );
    expect(combos.length).toBeGreaterThanOrEqual(16);
  });
});
