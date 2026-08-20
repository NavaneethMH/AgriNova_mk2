import {
  boolean,
  float,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core Manus-authenticated user profile. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "agronomist"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const farms = mysqlTable(
  "farms",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    location: varchar("location", { length: 255 }),
    areaHectares: float("areaHectares"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("farms_user_idx").on(table.userId)],
);

export const crops = mysqlTable("crops", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  variety: varchar("variety", { length: 120 }),
  waterRequirement: varchar("waterRequirement", { length: 64 }),
  growthDurationDays: int("growthDurationDays"),
  isActive: boolean("isActive").default(true).notNull(),
});

export const cropGrowthStages = mysqlTable(
  "cropGrowthStages",
  {
    id: int("id").autoincrement().primaryKey(),
    cropId: int("cropId").notNull().references(() => crops.id, { onDelete: "cascade" }),
    stageName: varchar("stageName", { length: 80 }).notNull(),
    startDay: int("startDay").notNull(),
    endDay: int("endDay").notNull(),
    waterSensitivity: int("waterSensitivity").notNull(),
    preferredMoistureMin: float("preferredMoistureMin"),
    preferredMoistureMax: float("preferredMoistureMax"),
  },
  table => [index("growth_stage_crop_idx").on(table.cropId)],
);

export const fields = mysqlTable(
  "fields",
  {
    id: int("id").autoincrement().primaryKey(),
    farmId: int("farmId").notNull().references(() => farms.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    cropType: varchar("cropType", { length: 120 }).notNull(),
    cropStage: mysqlEnum("cropStage", ["establishment", "vegetative", "flowering", "maturity"])
      .default("vegetative")
      .notNull(),
    areaHectares: float("areaHectares").notNull(),
    soilType: varchar("soilType", { length: 120 }).notNull(),
    /** Standard GeoJSON Feature or Polygon describing the managed field boundary. */
    boundaryGeoJson: text("boundaryGeoJson"),
    latitude: float("latitude").notNull(),
    longitude: float("longitude").notNull(),
    irrigationMethod: mysqlEnum("irrigationMethod", ["drip", "sprinkler", "flood", "other"])
      .default("drip")
      .notNull(),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("fields_farm_idx").on(table.farmId)],
);

/** Cached metadata and overlay URLs returned by the external Sentinel-2 analysis service. */
export const satelliteAnalyses = mysqlTable(
  "satelliteAnalyses",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    indexType: mysqlEnum("indexType", ["ndvi", "ndwi"]).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    overlayUrl: text("overlayUrl").notNull(),
    boundsJson: text("boundsJson").notNull(),
    meanValue: float("meanValue"),
    acquiredAt: timestamp("acquiredAt"),
    cloudPercent: float("cloudPercent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("satellite_analysis_field_idx").on(table.fieldId, table.createdAt)],
);

export const sensors = mysqlTable(
  "sensors",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    sensorType: varchar("sensorType", { length: 80 }).notNull(),
    deviceId: varchar("deviceId", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["active", "offline", "maintenance"]).default("active").notNull(),
    lastSeenAt: timestamp("lastSeenAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("sensor_device_unq").on(table.deviceId), index("sensor_field_idx").on(table.fieldId)],
);

export const sensorReadings = mysqlTable(
  "sensorReadings",
  {
    id: int("id").autoincrement().primaryKey(),
    sensorId: int("sensorId").notNull().references(() => sensors.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    soilMoisture: float("soilMoisture").notNull(),
    temperatureC: float("temperatureC").notNull(),
    humidityPercent: float("humidityPercent").notNull(),
  },
  table => [index("sensor_readings_sensor_time_idx").on(table.sensorId, table.recordedAt)],
);

export const weatherRecords = mysqlTable(
  "weatherRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    temperatureC: float("temperatureC").notNull(),
    humidityPercent: float("humidityPercent").notNull(),
    rainfallMm: float("rainfallMm").default(0).notNull(),
    windSpeedKph: float("windSpeedKph").default(0).notNull(),
    forecastRainfallMm: float("forecastRainfallMm").default(0).notNull(),
    forecastJson: text("forecastJson"),
  },
  table => [index("weather_field_time_idx").on(table.fieldId, table.recordedAt)],
);

export const irrigationEvents = mysqlTable(
  "irrigationEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurredAt").notNull(),
    durationMinutes: int("durationMinutes").notNull(),
    waterVolumeLiters: float("waterVolumeLiters").notNull(),
    method: mysqlEnum("method", ["drip", "sprinkler", "flood", "other"]).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("irrigation_field_time_idx").on(table.fieldId, table.occurredAt)],
);

export const stressScores = mysqlTable(
  "stressScores",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
    score: int("score").notNull(),
    riskLevel: mysqlEnum("riskLevel", ["optimal", "mild", "moderate", "severe"]).notNull(),
    confidence: int("confidence").notNull(),
    factorsJson: text("factorsJson"),
  },
  table => [index("stress_field_time_idx").on(table.fieldId, table.recordedAt)],
);

export const recommendations = mysqlTable(
  "recommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    stressScoreId: int("stressScoreId").references(() => stressScores.id, { onDelete: "set null" }),
    reasoning: text("reasoning").notNull(),
    suggestedWaterVolume: varchar("suggestedWaterVolume", { length: 160 }).notNull(),
    optimalTimingWindow: varchar("optimalTimingWindow", { length: 160 }).notNull(),
    irrigationMethod: varchar("irrigationMethod", { length: 80 }).notNull(),
    confidence: int("confidence").notNull(),
    source: mysqlEnum("source", ["rule", "llm"]).default("rule").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("recommendation_field_time_idx").on(table.fieldId, table.createdAt)],
);

export const alerts = mysqlTable(
  "alerts",
  {
    id: int("id").autoincrement().primaryKey(),
    fieldId: int("fieldId").notNull().references(() => fields.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["stress", "irrigation", "rainfall", "data_quality", "daily_summary"]).notNull(),
    severity: mysqlEnum("severity", ["optimal", "mild", "moderate", "severe"]).notNull(),
    message: text("message").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("alerts_field_time_idx").on(table.fieldId, table.createdAt)],
);

export const notificationPreferences = mysqlTable(
  "notificationPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    dailyStressSummaryEnabled: boolean("dailyStressSummaryEnabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("notification_preference_user_unq").on(table.userId)],
);

export const scheduledJobs = mysqlTable("scheduledJobs", {
  id: int("id").autoincrement().primaryKey(),
  jobKey: varchar("jobKey", { length: 80 }).notNull().unique(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastRunDate: varchar("lastRunDate", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Field = typeof fields.$inferSelect;
export type StressLevel = "optimal" | "mild" | "moderate" | "severe";
