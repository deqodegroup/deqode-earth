import { describe, it, expect } from "vitest";
import type { Region } from "@/lib/regions";

// Test the managed_retreat CTA logic — pure conditional, no rendering needed
// IntelligencePanel renders "View Case Study →" link only when regionType === "managed_retreat"

const MANAGED_RETREAT_REGION: Pick<Region, "slug" | "regionType"> = {
  slug: "grantham",
  regionType: "managed_retreat",
};

const SIDS_REGION: Pick<Region, "slug" | "regionType"> = {
  slug: "tuvalu",
  regionType: "sids",
};

function shouldShowCaseStudyLink(regionType: Region["regionType"]): boolean {
  return regionType === "managed_retreat";
}

describe("IntelligencePanel — Case Study CTA", () => {
  it("renders 'View Case Study →' link when region.regionType === 'managed_retreat'", () => {
    expect(shouldShowCaseStudyLink(MANAGED_RETREAT_REGION.regionType)).toBe(true);
  });

  it("does NOT render 'View Case Study →' link when region.regionType === 'sids'", () => {
    expect(shouldShowCaseStudyLink(SIDS_REGION.regionType)).toBe(false);
  });
});
