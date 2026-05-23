import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchDtmDisplacement } from "../dtm";

const ORIGINAL_KEY = process.env.DTM_API_KEY;
const ORIGINAL_FETCH = globalThis.fetch;

describe("fetchDtmDisplacement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.DTM_API_KEY;
    } else {
      process.env.DTM_API_KEY = ORIGINAL_KEY;
    }
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("returns null when DTM_API_KEY is unset", async () => {
    delete process.env.DTM_API_KEY;
    const result = await fetchDtmDisplacement("TUV");
    expect(result).toBeNull();
  });

  it("returns null when API responds non-200", async () => {
    process.env.DTM_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    const result = await fetchDtmDisplacement("TUV");
    expect(result).toBeNull();
  });

  it("returns DtmResult with source 'dtm' on success", async () => {
    process.env.DTM_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ totalDisplaced: 28400 }),
    }) as unknown as typeof fetch;
    const result = await fetchDtmDisplacement("FJI");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("dtm");
    expect(result?.total_displaced).toBe(28400);
    expect(result?.country).toBe("FJI");
  });

  it("returns null when fetch throws", async () => {
    process.env.DTM_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    const result = await fetchDtmDisplacement("KIR");
    expect(result).toBeNull();
  });
});
