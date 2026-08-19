import { desc, eq } from "drizzle-orm";
import { and, gte } from "drizzle-orm";
import { alerts, recommendations, type StressLevel } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { getFieldSummary } from "./repository";
import { needsIrrigationReminder } from "./stressEngine";
import { refreshFieldWeather } from "./weather";

type Recommendation = {
  reasoning: string;
  suggestedWaterVolume: string;
  optimalTimingWindow: string;
  irrigationMethod: string;
  confidence: number;
};

const recommendationSchema = {
  type: "object",
  properties: {
    reasoning: { type: "string", minLength: 20, maxLength: 700 },
    suggestedWaterVolume: { type: "string", minLength: 2, maxLength: 160 },
    optimalTimingWindow: { type: "string", minLength: 2, maxLength: 160 },
    irrigationMethod: { type: "string", minLength: 2, maxLength: 80 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["reasoning", "suggestedWaterVolume", "optimalTimingWindow", "irrigationMethod", "confidence"],
  additionalProperties: false,
};

export function parseRecommendation(content: unknown): Recommendation {
  if (typeof content !== "string") throw new Error("The AI returned an unsupported response format.");
  const parsed = JSON.parse(content) as Partial<Recommendation>;
  if (
    typeof parsed.reasoning !== "string" ||
    typeof parsed.suggestedWaterVolume !== "string" ||
    typeof parsed.optimalTimingWindow !== "string" ||
    typeof parsed.irrigationMethod !== "string" ||
    typeof parsed.confidence !== "number"
  ) {
    throw new Error("The AI recommendation did not include every required decision component.");
  }
  return {
    reasoning: parsed.reasoning,
    suggestedWaterVolume: parsed.suggestedWaterVolume,
    optimalTimingWindow: parsed.optimalTimingWindow,
    irrigationMethod: parsed.irrigationMethod,
    confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence))),
  };
}

export function shouldCreateIrrigationAlert(riskLevel: StressLevel, optimalTimingWindow: string) {
  return needsIrrigationReminder(riskLevel, optimalTimingWindow);
}

export async function createAiRecommendation(userId: number, fieldId: number) {
  const summary = await getFieldSummary(userId, fieldId);
  if (!summary) return undefined;
  if (!summary.latestReading || !summary.latestStress) {
    throw new Error("Record a current soil, temperature, and humidity reading before requesting a recommendation.");
  }

  const weather = await refreshFieldWeather(summary.field);
  const irrigation = summary.latestIrrigation;
  const prompt = {
    field: {
      name: summary.field.name,
      cropType: summary.field.cropType,
      cropStage: summary.field.cropStage,
      areaHectares: summary.field.areaHectares,
      soilType: summary.field.soilType,
      irrigationMethod: summary.field.irrigationMethod,
    },
    currentSensorData: summary.latestReading,
    stress: {
      score: summary.latestStress.score,
      level: summary.latestStress.riskLevel,
      confidence: summary.latestStress.confidence,
    },
    latestIrrigation: irrigation
      ? { occurredAt: irrigation.occurredAt.toISOString(), durationMinutes: irrigation.durationMinutes, waterVolumeLiters: irrigation.waterVolumeLiters }
      : "No completed irrigation has been recorded.",
    weather: {
      current: weather.current,
      nextTwoDays: weather.forecast.slice(0, 2),
      forecastRainfallMm: weather.forecastRainfallMm,
    },
  };

  const response = await invokeLLM({
    max_tokens: 450,
    response_format: { type: "json_schema", json_schema: { name: "irrigation_recommendation", strict: true, schema: recommendationSchema } },
    messages: [
      {
        role: "system",
        content:
          "You are AgriNova's irrigation decision-support assistant. Give cautious, plain-language advice. You are not an autonomous controller and must not claim certainty beyond the supplied field data. Use weather outlook to avoid unnecessary irrigation before meaningful rain. Return only the required JSON object.",
      },
      { role: "user", content: `Generate a field-specific irrigation recommendation from this input: ${JSON.stringify(prompt)}` },
    ],
  });
  const recommendation = parseRecommendation(response.choices[0]?.message.content);
  const db = await getDb();
  if (!db) throw new Error("The AgriNova data store is not available.");
  const [created] = await db
    .insert(recommendations)
    .values({ fieldId, stressScoreId: summary.latestStress.id, ...recommendation, source: "llm" })
    .$returningId();
  if (shouldCreateIrrigationAlert(summary.latestStress.riskLevel, recommendation.optimalTimingWindow)) {
    const reminderCutoff = new Date(Date.now() - 12 * 60 * 60 * 1_000);
    const [existingReminder] = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(
        and(
          eq(alerts.fieldId, fieldId),
          eq(alerts.type, "irrigation"),
          gte(alerts.createdAt, reminderCutoff),
        ),
      )
      .limit(1);
    if (!existingReminder) {
      await db.insert(alerts).values({
        fieldId,
        type: "irrigation",
        severity: summary.latestStress.riskLevel,
        message: `AI irrigation reminder for ${summary.field.name}: ${recommendation.optimalTimingWindow}. Suggested application: ${recommendation.suggestedWaterVolume}.`,
      });
    }
  }
  const [saved] = await db.select().from(recommendations).where(eq(recommendations.id, created.id)).limit(1);
  return saved ?? recommendation;
}

export async function getLatestRecommendation(userId: number, fieldId: number) {
  const summary = await getFieldSummary(userId, fieldId);
  if (!summary) return undefined;
  const db = await getDb();
  if (!db) throw new Error("The AgriNova data store is not available.");
  const [recommendation] = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.fieldId, fieldId))
    .orderBy(desc(recommendations.createdAt))
    .limit(1);
  return recommendation ?? null;
}

export { recommendationSchema };
