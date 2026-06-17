import { describe, expect, it } from "vitest";
import { validateRmacSubmission } from "./validation";

function validFormData() {
  const data = new FormData();
  data.set("activityDate", "2026-06-14");
  data.set("actionArea", "marine");
  data.set("description", "Completed a reef health walk with the village monitoring team.");
  data.set("peopleCount", "8");
  data.set("visibility", "committee");
  data.set("photoConsentConfirmed", "false");
  return data;
}

describe("validateRmacSubmission", () => {
  it("accepts a valid activity", () => {
    expect(validateRmacSubmission(validFormData())).toHaveProperty("value");
  });

  it("rejects short descriptions", () => {
    const data = validFormData();
    data.set("description", "Too short");
    expect(validateRmacSubmission(data)).toEqual({
      error: "Describe the activity in 20 to 2,000 characters.",
    });
  });

  it("rejects invalid coordinates", () => {
    const data = validFormData();
    data.set("latitude", "-190");
    expect(validateRmacSubmission(data)).toEqual({
      error: "Location coordinates are invalid.",
    });
  });

  it("rejects impossible dates", () => {
    const data = validFormData();
    data.set("activityDate", "2026-02-31");
    expect(validateRmacSubmission(data)).toEqual({
      error: "Enter a valid activity date.",
    });
  });

  it("rejects future dates", () => {
    const data = validFormData();
    data.set("activityDate", "2099-01-01");
    expect(validateRmacSubmission(data)).toEqual({
      error: "Activity date cannot be in the future.",
    });
  });

  it("requires consent when a photo is attached", () => {
    const data = validFormData();
    data.set(
      "evidence",
      new File(["photo"], "reef.jpg", { type: "image/jpeg" })
    );
    expect(validateRmacSubmission(data)).toEqual({
      error: "Confirm consent before submitting identifiable photos.",
    });
  });
});
