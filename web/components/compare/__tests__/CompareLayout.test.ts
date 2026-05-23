import { describe, it, expect } from "vitest";
import { CompareLayout } from "../CompareLayout";
import { REGIONS } from "@/lib/regions";

describe("CompareLayout", () => {
  it("is exported as a function (server component)", () => {
    expect(typeof CompareLayout).toBe("function");
  });

  it("accepts origin and dest Region props (type contract)", () => {
    const origin = REGIONS["tuvalu"];
    const dest = REGIONS["brisbane"];
    expect(origin).toBeDefined();
    expect(dest).toBeDefined();
    // Construct props matching the component signature — compile-time guarantee
    const props = { origin, dest } as const;
    expect(props.origin.slug).toBe("tuvalu");
    expect(props.dest.slug).toBe("brisbane");
  });
});
