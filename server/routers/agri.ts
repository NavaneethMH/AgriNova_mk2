import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createField,
  deleteField,
  getDashboard,
  getFieldSummary,
  getIrrigationHistory,
  getStressHistory,
  listFieldsForUser,
  recordIrrigation,
  recordManualReading,
  updateField,
} from "../agri/repository";
import { createAiRecommendation, getLatestRecommendation } from "../agri/recommendations";
import { fieldBoundarySchema } from "../agri/geojson";
import { analyzeFieldSatellite, getLatestSatelliteAnalysis } from "../agri/satellite";
import { getStoredWeather, refreshFieldWeather } from "../agri/weather";
import { and, desc, eq } from "drizzle-orm";
import { alerts, farms, fields, scheduledJobs } from "../../drizzle/schema";
import { getDb } from "../db";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob } from "../_core/heartbeat";
import { adminProcedure } from "../_core/trpc";
import { protectedProcedure, router } from "../_core/trpc";

const cropStageSchema = z.enum(["establishment", "vegetative", "flowering", "maturity"]);
const irrigationMethodSchema = z.enum(["drip", "sprinkler", "flood", "other"]);
const satelliteIndexSchema = z.enum(["ndvi", "ndwi"]);
const fieldInput = z.object({
  name: z.string().trim().min(2).max(160),
  cropType: z.string().trim().min(2).max(120),
  cropStage: cropStageSchema,
  areaHectares: z.number().positive().max(100_000),
  soilType: z.string().trim().min(2).max(120),
  boundary: fieldBoundarySchema,
  irrigationMethod: irrigationMethodSchema,
  farmName: z.string().trim().min(2).max(160).optional(),
  location: z.string().trim().max(255).optional(),
});

export function requireOwned<T>(value: T | undefined, message = "This field was not found or is not available to this account.") {
  if (!value) throw new TRPCError({ code: "NOT_FOUND", message });
  return value;
}

export const agriRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
  fields: router({
    list: protectedProcedure.query(({ ctx }) => listFieldsForUser(ctx.user.id)),
    detail: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).query(async ({ ctx, input }) =>
      requireOwned(await getFieldSummary(ctx.user.id, input.fieldId)),
    ),
    create: protectedProcedure.input(fieldInput).mutation(({ ctx, input }) => createField(ctx.user.id, input)),
    update: protectedProcedure
      .input(z.object({ fieldId: z.number().int().positive(), values: fieldInput.partial().refine(values => Object.keys(values).length > 0) }))
      .mutation(async ({ ctx, input }) => requireOwned(await updateField(ctx.user.id, input.fieldId, input.values))),
    delete: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await deleteField(ctx.user.id, input.fieldId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "This field was not found or is not available to this account." });
      return { success: true } as const;
    }),
  }),
  readings: router({
    recordManual: protectedProcedure
      .input(
        z.object({
          fieldId: z.number().int().positive(),
          soilMoisture: z.number().min(0).max(100),
          temperatureC: z.number().min(-40).max(70),
          humidityPercent: z.number().min(0).max(100),
        }),
      )
      .mutation(async ({ ctx, input }) => requireOwned(await recordManualReading(ctx.user.id, input))),
  }),
  stress: router({
    history: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).query(async ({ ctx, input }) =>
      requireOwned(await getStressHistory(ctx.user.id, input.fieldId)),
    ),
  }),
  irrigation: router({
    list: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).query(async ({ ctx, input }) =>
      requireOwned(await getIrrigationHistory(ctx.user.id, input.fieldId)),
    ),
    record: protectedProcedure
      .input(
        z.object({
          fieldId: z.number().int().positive(),
          occurredAt: z.date(),
          durationMinutes: z.number().int().positive().max(1_440),
          waterVolumeLiters: z.number().positive().max(100_000_000),
          method: irrigationMethodSchema,
          notes: z.string().trim().max(2_000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => requireOwned(await recordIrrigation(ctx.user.id, input))),
  }),
  weather: router({
    refresh: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const summary = await getFieldSummary(ctx.user.id, input.fieldId);
      if (!summary) throw new TRPCError({ code: "NOT_FOUND", message: "This field was not found or is not available to this account." });
      return refreshFieldWeather(summary.field);
    }),
    latest: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const summary = await getFieldSummary(ctx.user.id, input.fieldId);
      if (!summary) throw new TRPCError({ code: "NOT_FOUND", message: "This field was not found or is not available to this account." });
      return getStoredWeather(input.fieldId);
    }),
  }),
  recommendations: router({
    latest: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).query(async ({ ctx, input }) =>
      requireOwned(await getLatestRecommendation(ctx.user.id, input.fieldId)),
    ),
    generate: protectedProcedure.input(z.object({ fieldId: z.number().int().positive() })).mutation(async ({ ctx, input }) =>
      requireOwned(await createAiRecommendation(ctx.user.id, input.fieldId)),
    ),
  }),
  satellite: router({
    latest: protectedProcedure
      .input(z.object({ fieldId: z.number().int().positive(), indexType: satelliteIndexSchema }))
      .query(async ({ ctx, input }) => {
        const result = await getLatestSatelliteAnalysis(ctx.user.id, input.fieldId, input.indexType);
        if (result === undefined) throw new TRPCError({ code: "NOT_FOUND", message: "This field was not found or is not available to this account." });
        return result;
      }),
    analyze: protectedProcedure
      .input(z.object({ fieldId: z.number().int().positive(), indexType: satelliteIndexSchema }))
      .mutation(async ({ ctx, input }) => requireOwned(await analyzeFieldSatellite(ctx.user.id, input.fieldId, input.indexType))),
  }),
  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("The AgriNova data store is not available.");
      return db
        .select({ alert: alerts, fieldName: fields.name })
        .from(alerts)
        .innerJoin(fields, eq(alerts.fieldId, fields.id))
        .innerJoin(farms, eq(fields.farmId, farms.id))
        .where(eq(farms.userId, ctx.user.id))
        .orderBy(desc(alerts.createdAt))
        .limit(100);
    }),
    acknowledge: protectedProcedure.input(z.object({ alertId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("The AgriNova data store is not available.");
      const [owned] = await db
        .select({ id: alerts.id })
        .from(alerts)
        .innerJoin(fields, eq(alerts.fieldId, fields.id))
        .innerJoin(farms, eq(fields.farmId, farms.id))
        .where(and(eq(alerts.id, input.alertId), eq(farms.userId, ctx.user.id)))
        .limit(1);
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "This alert was not found or is not available to this account." });
      await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, input.alertId));
      return { success: true } as const;
    }),
  }),
  automation: router({
    createDailyStressSummary: adminProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("The AgriNova data store is not available.");
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob(
        {
          name: `agrinova-daily-stress-summary-${ctx.user.id}`,
          cron: "0 0 5 * * *",
          path: "/api/scheduled/daily-stress-summary",
          description: "Daily summary of AgriNova fields at moderate or severe water-stress thresholds.",
        },
        sessionToken,
      );
      const [existing] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.jobKey, "daily-stress-summary")).limit(1);
      if (existing) {
        await db.update(scheduledJobs).set({ scheduleCronTaskUid: job.taskUid, lastRunDate: null }).where(eq(scheduledJobs.id, existing.id));
      } else {
        await db.insert(scheduledJobs).values({ jobKey: "daily-stress-summary", scheduleCronTaskUid: job.taskUid });
      }
      return job;
    }),
  }),
});
