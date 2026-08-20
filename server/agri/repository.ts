import { and, desc, eq } from "drizzle-orm";
import {
  alerts,
  farms,
  fields,
  irrigationEvents,
  recommendations,
  sensorReadings,
  sensors,
  stressScores,
  weatherRecords,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { baselineIrrigationAdvice, calculateStress, needsIrrigationReminder } from "./stressEngine";
import { centroidFromBoundary, type FieldBoundary } from "./geojson";

export type FieldInput = {
  name: string;
  cropType: string;
  cropStage: "establishment" | "vegetative" | "flowering" | "maturity";
  areaHectares: number;
  soilType: string;
  boundary: FieldBoundary;
  irrigationMethod: "drip" | "sprinkler" | "flood" | "other";
  farmName?: string;
  location?: string;
};

function dbUnavailable() {
  throw new Error("The AgriNova data store is not available.");
}

export async function getOrCreateFarm(userId: number, farmName = "My Farm", location?: string) {
  const db = await getDb();
  if (!db) dbUnavailable();

  const [existing] = await db!
    .select()
    .from(farms)
    .where(eq(farms.userId, userId))
    .orderBy(desc(farms.createdAt))
    .limit(1);

  if (existing) return existing;
  const [created] = await db!
    .insert(farms)
    .values({ userId, name: farmName, location: location || null })
    .$returningId();

  const [farm] = await db!.select().from(farms).where(eq(farms.id, created.id)).limit(1);
  if (!farm) throw new Error("Unable to create a farm for this account.");
  return farm;
}

export async function getOwnedField(userId: number, fieldId: number) {
  const db = await getDb();
  if (!db) dbUnavailable();

  const [row] = await db!
    .select({ field: fields, farm: farms })
    .from(fields)
    .innerJoin(farms, eq(fields.farmId, farms.id))
    .where(and(eq(fields.id, fieldId), eq(farms.userId, userId)))
    .limit(1);
  return row?.field;
}

export async function listFieldsForUser(userId: number) {
  const db = await getDb();
  if (!db) dbUnavailable();

  return db!
    .select({ field: fields, farmName: farms.name })
    .from(fields)
    .innerJoin(farms, eq(fields.farmId, farms.id))
    .where(and(eq(farms.userId, userId), eq(fields.status, "active")))
    .orderBy(desc(fields.updatedAt));
}

export async function createField(userId: number, input: FieldInput) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const farm = await getOrCreateFarm(userId, input.farmName, input.location);
  const centroid = centroidFromBoundary(input.boundary);

  const [created] = await db!
    .insert(fields)
    .values({
      farmId: farm.id,
      name: input.name,
      cropType: input.cropType,
      cropStage: input.cropStage,
      areaHectares: input.areaHectares,
      soilType: input.soilType,
      boundaryGeoJson: JSON.stringify(input.boundary),
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      irrigationMethod: input.irrigationMethod,
    })
    .$returningId();

  const field = await getOwnedField(userId, created.id);
  if (!field) throw new Error("Unable to create the new field.");
  return field;
}

export async function updateField(userId: number, fieldId: number, input: Partial<FieldInput>) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, fieldId);
  if (!field) return undefined;
  const centroid = input.boundary ? centroidFromBoundary(input.boundary) : null;

  await db!
    .update(fields)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.cropType !== undefined ? { cropType: input.cropType } : {}),
      ...(input.cropStage !== undefined ? { cropStage: input.cropStage } : {}),
      ...(input.areaHectares !== undefined ? { areaHectares: input.areaHectares } : {}),
      ...(input.soilType !== undefined ? { soilType: input.soilType } : {}),
      ...(input.boundary !== undefined ? { boundaryGeoJson: JSON.stringify(input.boundary) } : {}),
      ...(centroid ? { latitude: centroid.latitude, longitude: centroid.longitude } : {}),
      ...(input.irrigationMethod !== undefined ? { irrigationMethod: input.irrigationMethod } : {}),
    })
    .where(eq(fields.id, fieldId));

  return getOwnedField(userId, fieldId);
}

export async function deleteField(userId: number, fieldId: number) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, fieldId);
  if (!field) return false;
  await db!.delete(fields).where(eq(fields.id, fieldId));
  return true;
}

export async function getFieldSummary(userId: number, fieldId: number) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, fieldId);
  if (!field) return undefined;

  const [latestStress, latestIrrigation, latestReading, latestRecommendation, latestWeather] = await Promise.all([
    db!.select().from(stressScores).where(eq(stressScores.fieldId, fieldId)).orderBy(desc(stressScores.recordedAt)).limit(1),
    db!.select().from(irrigationEvents).where(eq(irrigationEvents.fieldId, fieldId)).orderBy(desc(irrigationEvents.occurredAt)).limit(1),
    db!
      .select({ reading: sensorReadings })
      .from(sensorReadings)
      .innerJoin(sensors, eq(sensorReadings.sensorId, sensors.id))
      .where(eq(sensors.fieldId, fieldId))
      .orderBy(desc(sensorReadings.recordedAt))
      .limit(1),
    db!.select().from(recommendations).where(eq(recommendations.fieldId, fieldId)).orderBy(desc(recommendations.createdAt)).limit(1),
    db!.select().from(weatherRecords).where(eq(weatherRecords.fieldId, fieldId)).orderBy(desc(weatherRecords.recordedAt)).limit(1),
  ]);

  return {
    field,
    latestStress: latestStress[0] ?? null,
    latestIrrigation: latestIrrigation[0] ?? null,
    latestReading: latestReading[0]?.reading ?? null,
    latestRecommendation: latestRecommendation[0] ?? null,
    latestWeather: latestWeather[0] ?? null,
  };
}

export async function getDashboard(userId: number) {
  const fieldRows = await listFieldsForUser(userId);
  const summaries = await Promise.all(
    fieldRows.map(async row => ({ farmName: row.farmName, ...(await getFieldSummary(userId, row.field.id))! })),
  );
  return summaries;
}

export async function recordManualReading(
  userId: number,
  input: { fieldId: number; soilMoisture: number; temperatureC: number; humidityPercent: number },
) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, input.fieldId);
  if (!field) return undefined;

  const deviceId = `manual-field-${field.id}`;
  let [sensor] = await db!.select().from(sensors).where(eq(sensors.deviceId, deviceId)).limit(1);
  if (!sensor) {
    const [created] = await db!
      .insert(sensors)
      .values({ fieldId: field.id, sensorType: "manual", deviceId, lastSeenAt: new Date() })
      .$returningId();
    [sensor] = await db!.select().from(sensors).where(eq(sensors.id, created.id)).limit(1);
  }
  if (!sensor) throw new Error("Unable to prepare a manual sensor for this field.");

  const now = new Date();
  await db!.insert(sensorReadings).values({
    sensorId: sensor.id,
    recordedAt: now,
    soilMoisture: input.soilMoisture,
    temperatureC: input.temperatureC,
    humidityPercent: input.humidityPercent,
  });
  await db!.update(sensors).set({ lastSeenAt: now, status: "active" }).where(eq(sensors.id, sensor.id));

  const [lastIrrigation, latestWeather] = await Promise.all([
    db!
      .select()
      .from(irrigationEvents)
      .where(eq(irrigationEvents.fieldId, field.id))
      .orderBy(desc(irrigationEvents.occurredAt))
      .limit(1),
    db!
      .select()
      .from(weatherRecords)
      .where(eq(weatherRecords.fieldId, field.id))
      .orderBy(desc(weatherRecords.recordedAt))
      .limit(1),
  ]);

  const hoursSinceIrrigation = lastIrrigation[0]
    ? Math.max(0, (now.getTime() - lastIrrigation[0].occurredAt.getTime()) / 3_600_000)
    : 96;
  const forecastRainfallMm = latestWeather[0]?.forecastRainfallMm ?? 0;
  const result = calculateStress({
    soilMoisture: input.soilMoisture,
    temperatureC: input.temperatureC,
    humidityPercent: input.humidityPercent,
    forecastRainfallMm,
    hoursSinceIrrigation,
    cropStage: field.cropStage,
  });
  const [createdStress] = await db!
    .insert(stressScores)
    .values({
      fieldId: field.id,
      recordedAt: now,
      score: result.score,
      riskLevel: result.level,
      confidence: result.confidence,
      factorsJson: JSON.stringify(result.factors),
    })
    .$returningId();

  const advice = baselineIrrigationAdvice({
    result,
    areaHectares: field.areaHectares,
    forecastRainfallMm,
    irrigationMethod: field.irrigationMethod,
  });
  await db!.insert(recommendations).values({
    fieldId: field.id,
    stressScoreId: createdStress.id,
    ...advice,
    source: "rule",
  });

  if (result.level === "moderate" || result.level === "severe") {
    await db!.insert(alerts).values({
      fieldId: field.id,
      type: "stress",
      severity: result.level,
      message: `${field.name} is at ${result.level} water-stress risk (${result.score}/100). ${advice.optimalTimingWindow}.`,
    });
  }
  if (needsIrrigationReminder(result.level, advice.optimalTimingWindow)) {
    await db!.insert(alerts).values({
      fieldId: field.id,
      type: "irrigation",
      severity: result.level,
      message: `Irrigation reminder for ${field.name}: ${advice.optimalTimingWindow}. Suggested application: ${advice.suggestedWaterVolume}.`,
    });
  }

  return { result, advice };
}

export async function recordIrrigation(
  userId: number,
  input: {
    fieldId: number;
    occurredAt: Date;
    durationMinutes: number;
    waterVolumeLiters: number;
    method: "drip" | "sprinkler" | "flood" | "other";
    notes?: string;
  },
) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, input.fieldId);
  if (!field) return undefined;

  const [created] = await db!
    .insert(irrigationEvents)
    .values({
      fieldId: field.id,
      occurredAt: input.occurredAt,
      durationMinutes: input.durationMinutes,
      waterVolumeLiters: input.waterVolumeLiters,
      method: input.method,
      notes: input.notes || null,
    })
    .$returningId();
  const [event] = await db!.select().from(irrigationEvents).where(eq(irrigationEvents.id, created.id)).limit(1);
  return event;
}

export async function getStressHistory(userId: number, fieldId: number) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, fieldId);
  if (!field) return undefined;
  return db!
    .select()
    .from(stressScores)
    .where(eq(stressScores.fieldId, fieldId))
    .orderBy(desc(stressScores.recordedAt))
    .limit(60);
}

export async function getIrrigationHistory(userId: number, fieldId: number) {
  const db = await getDb();
  if (!db) dbUnavailable();
  const field = await getOwnedField(userId, fieldId);
  if (!field) return undefined;
  return db!
    .select()
    .from(irrigationEvents)
    .where(eq(irrigationEvents.fieldId, fieldId))
    .orderBy(desc(irrigationEvents.occurredAt))
    .limit(100);
}
