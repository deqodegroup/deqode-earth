import { describe, it, expect, vi } from "vitest";

// Mock the regions module
vi.mock("@/lib/regions", () => ({
  REGION_LIST: [
    { slug: "niue",             isLive: true  },
    { slug: "tuvalu",          isLive: true  },
    { slug: "fiji",            isLive: true  },
    { slug: "vanuatu",         isLive: true  },
    { slug: "solomon-islands", isLive: true  },
    { slug: "palau",           isLive: true  },
    { slug: "kiribati",        isLive: true  },
    { slug: "marshall-islands",isLive: true  },
    { slug: "brisbane",        isLive: true  },
    { slug: "grantham",        isLive: true  },
  ],
}));

// Pure logic test: StatusStrip liveCount calculation
describe("StatusStrip — liveCount", () => {
  it("counts 10 live regions from REGION_LIST", async () => {
    const { REGION_LIST } = await import("@/lib/regions");
    const liveCount = REGION_LIST.filter((r) => r.isLive).length;
    expect(liveCount).toBe(10);
  });
});

describe("StatusStrip data health summary", () => {
  it("shows all sources current when every source is healthy", async () => {
    const { summarizeDataHealth } = await import("./StatusStrip");

    expect(
      summarizeDataHealth([
        { source: "open_meteo", status: "healthy", last_success_at: "2026-06-17" },
        { source: "noaa_coraltemp", status: "healthy", last_success_at: "2026-06-17" },
      ])
    ).toEqual({ color: "teal", label: "Data 2/2 current" });
  });

  it("surfaces partial source freshness without technical detail", async () => {
    const { summarizeDataHealth } = await import("./StatusStrip");

    expect(
      summarizeDataHealth([
        { source: "open_meteo", status: "healthy", last_success_at: "2026-06-17" },
        { source: "wmip", status: "failed", last_success_at: null },
      ])
    ).toEqual({ color: "gold", label: "Data 1/2 current" });
  });
});
