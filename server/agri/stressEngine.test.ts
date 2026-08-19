import { describe, expect, it } from "vitest";
import { baselineIrrigationAdvice, calculateStress, needsIrrigationReminder, stressLevelFor } from "./stressEngine";

describe("AgriNova stress engine", () => {
  it("uses the exact four public stress labels", () => {
    expect(stressLevelFor(30)).toBe("optimal");
    expect(stressLevelFor(31)).toBe("mild");
    expect(stressLevelFor(51)).toBe("moderate");
    expect(stressLevelFor(76)).toBe("severe");
  });

  it("elevates risk for dry, hot, rain-free conditions with a long time since irrigation", () => {
    const result = calculateStress({
      soilMoisture: 9,
      temperatureC: 39,
      humidityPercent: 25,
      forecastRainfallMm: 0,
      hoursSinceIrrigation: 110,
      cropStage: "flowering",
    });
    expect(result.level).toBe("severe");
    expect(result.score).toBeGreaterThan(75);
  });

  it("defers a moderate irrigation recommendation when meaningful rainfall is expected", () => {
    const result = calculateStress({
      soilMoisture: 18,
      temperatureC: 29,
      humidityPercent: 45,
      forecastRainfallMm: 0,
      hoursSinceIrrigation: 80,
      cropStage: "vegetative",
    });
    const advice = baselineIrrigationAdvice({
      result: { ...result, level: "moderate" },
      areaHectares: 2,
      forecastRainfallMm: 12,
      irrigationMethod: "drip",
    });
    expect(advice.suggestedWaterVolume).toBe("No immediate application");
    expect(advice.optimalTimingWindow).toContain("reassess");
  });

  it("creates irrigation reminders only for near-term moderate or severe decisions", () => {
    expect(needsIrrigationReminder("severe", "Start within 6 hours, preferably before midday")).toBe(true);
    expect(needsIrrigationReminder("moderate", "Irrigate within 12 hours during the next low-evaporation window")).toBe(true);
    expect(needsIrrigationReminder("mild", "Irrigate within 12 hours during the next low-evaporation window")).toBe(false);
    expect(needsIrrigationReminder("moderate", "Wait for forecast rain; reassess in 24 hours")).toBe(false);
  });
});
