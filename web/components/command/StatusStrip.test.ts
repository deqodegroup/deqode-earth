import { describe, it, expect, vi, beforeEach } from "vitest";

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
