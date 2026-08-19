import { describe, expect, it } from "vitest";
import { parseRecommendation, shouldCreateIrrigationAlert } from "./recommendations";

describe("structured irrigation recommendations", () => {
  it("accepts a response containing every explicit decision component", () => {
    const recommendation = parseRecommendation(
      JSON.stringify({
        reasoning: "Soil moisture is below the crop-stage range and no meaningful rainfall is expected in the next 24 hours.",
        suggestedWaterVolume: "22 mm (about 220,000 L)",
        optimalTimingWindow: "Irrigate within 12 hours before midday.",
        irrigationMethod: "drip",
        confidence: 82,
      }),
    );
    expect(recommendation.suggestedWaterVolume).toContain("22 mm");
    expect(recommendation.optimalTimingWindow).toContain("12 hours");
  });

  it("rejects an incomplete AI response rather than hiding a missing decision component", () => {
    expect(() => parseRecommendation(JSON.stringify({ reasoning: "Incomplete response" }))).toThrow(
      "required decision component",
    );
  });

  it("flags an AI recommendation for a reminder only when moderate or severe action is near-term", () => {
    expect(shouldCreateIrrigationAlert("severe", "Start within 6 hours, preferably before midday.")).toBe(true);
    expect(shouldCreateIrrigationAlert("moderate", "Irrigate within 12 hours during the next low-evaporation window.")).toBe(true);
    expect(shouldCreateIrrigationAlert("mild", "Irrigate within 12 hours during the next low-evaporation window.")).toBe(false);
  });
});
