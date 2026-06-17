import { describe, expect, it } from "vitest";
import { buildRmacInsights, type RmacInsightActivity } from "./insights";

const activities: RmacInsightActivity[] = [
  {
    id: "one",
    referenceCode: "AS-1",
    activityDate: "2026-06-01",
    actionArea: "marine",
    description: "Reef monitoring activity",
    peopleCount: 8,
    spendNzd: 120,
    latitude: -19,
    longitude: -169,
    locationName: "Reef",
    reviewedAt: "2026-06-02T00:00:00Z",
    evidence: [{ id: "e1", originalName: "reef.jpg", url: null }],
  },
  {
    id: "two",
    referenceCode: "AS-2",
    activityDate: "2026-06-10",
    actionArea: "pollution",
    description: "Waste removal activity",
    peopleCount: 4,
    spendNzd: 80,
    latitude: null,
    longitude: null,
    locationName: "Coast",
    reviewedAt: "2026-06-11T00:00:00Z",
    evidence: [],
  },
];

describe("buildRmacInsights", () => {
  it("aggregates approved activity totals and reporting dates", () => {
    const result = buildRmacInsights(activities);
    expect(result.totals).toEqual({
      activities: 2,
      people: 12,
      spendNzd: 200,
      evidence: 1,
      actionAreasActive: 2,
    });
    expect(result.reporting.periodStart).toBe("2026-06-01");
    expect(result.reporting.periodEnd).toBe("2026-06-10");
    expect(result.reporting.lastApprovedAt).toBe("2026-06-11T00:00:00Z");
  });
});
