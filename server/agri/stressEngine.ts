import type { StressLevel } from "../../drizzle/schema";

export type StressInput = {
  soilMoisture: number;
  temperatureC: number;
  humidityPercent: number;
  forecastRainfallMm: number;
  hoursSinceIrrigation: number;
  cropStage: "establishment" | "vegetative" | "flowering" | "maturity";
  dataFreshnessHours?: number;
};

export type StressResult = {
  score: number;
  level: StressLevel;
  confidence: number;
  factors: {
    soilMoisture: number;
    temperature: number;
    weather: number;
    cropStage: number;
    irrigationHistory: number;
  };
};

const stageSensitivity = {
  establishment: 58,
  vegetative: 66,
  flowering: 84,
  maturity: 44,
} as const;

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

export function stressLevelFor(score: number): StressLevel {
  if (score <= 30) return "optimal";
  if (score <= 50) return "mild";
  if (score <= 75) return "moderate";
  return "severe";
}

/**
 * Deterministic MVP risk model. It weighs moisture deficit most heavily, then heat,
 * precipitation outlook, crop sensitivity, and time since the last recorded irrigation.
 */
export function calculateStress(input: StressInput): StressResult {
  const soilMoisture = clamp(((35 - input.soilMoisture) / 35) * 100);
  const temperature = clamp(((input.temperatureC - 23) / 17) * 100);
  const lowHumidity = clamp(((48 - input.humidityPercent) / 48) * 35);
  const noForecastRain = clamp(((18 - input.forecastRainfallMm) / 18) * 100);
  const weather = clamp(noForecastRain * 0.7 + lowHumidity * 0.3);
  const cropStage = stageSensitivity[input.cropStage];
  const irrigationHistory = clamp(((input.hoursSinceIrrigation - 24) / 72) * 100);

  const score = Math.round(
    soilMoisture * 0.38 +
      temperature * 0.2 +
      weather * 0.16 +
      cropStage * 0.12 +
      irrigationHistory * 0.14,
  );

  const freshnessPenalty = clamp((input.dataFreshnessHours ?? 0) * 2.5, 0, 40);
  const confidence = Math.round(clamp(94 - freshnessPenalty, 45, 94));

  return {
    score,
    level: stressLevelFor(score),
    confidence,
    factors: { soilMoisture, temperature, weather, cropStage, irrigationHistory },
  };
}

export function baselineIrrigationAdvice({
  result,
  areaHectares,
  forecastRainfallMm,
  irrigationMethod,
}: {
  result: StressResult;
  areaHectares: number;
  forecastRainfallMm: number;
  irrigationMethod: string;
}) {
  const deferForRain = result.level === "moderate" && forecastRainfallMm >= 8;
  const depthMm = deferForRain ? 0 : result.level === "severe" ? 34 : result.level === "moderate" ? 22 : result.level === "mild" ? 10 : 0;
  const volumeLiters = Math.round(depthMm * areaHectares * 10_000);
  const timing = deferForRain
    ? "Wait for forecast rain; reassess in 24 hours"
    : result.level === "severe"
      ? "Start within 6 hours, preferably before midday"
      : result.level === "moderate"
        ? "Irrigate within 12 hours during the next low-evaporation window"
        : result.level === "mild"
          ? "Monitor today; plan the next low-evaporation window"
          : "No irrigation action is needed; continue monitoring";

  const reason = deferForRain
    ? "Stress is elevated, but meaningful rainfall is forecast, so postponing irrigation avoids unnecessary water use."
    : result.level === "severe"
      ? "The combined moisture deficit, heat, weather outlook, crop sensitivity, and irrigation history indicate severe crop water-stress risk."
      : result.level === "moderate"
        ? "Crop water-stress risk is moderate and the rainfall outlook does not offset the moisture deficit."
        : result.level === "mild"
          ? "Early water-stress signals are present, but the field does not yet require immediate irrigation."
          : "Current soil, weather, crop-stage, and irrigation signals indicate an optimal water-stress level.";

  return {
    reasoning: reason,
    suggestedWaterVolume: depthMm === 0 ? "No immediate application" : `${depthMm} mm (about ${volumeLiters.toLocaleString()} L)`,
    optimalTimingWindow: timing,
    irrigationMethod,
    confidence: result.confidence,
  };
}

export function needsIrrigationReminder(level: StressLevel, timingWindow: string) {
  return (level === "moderate" || level === "severe") && /within (6|12) hours/i.test(timingWindow);
}
