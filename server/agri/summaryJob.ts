import { and, desc, eq, gte } from "drizzle-orm";
import { alerts, fields, farms, notificationPreferences, scheduledJobs, stressScores } from "../../drizzle/schema";
import { getDb } from "../db";

export const isModerateOrSevere = (level: string) => level === "moderate" || level === "severe";

const utcDate = () => new Date().toISOString().slice(0, 10);
const startOfUtcDay = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

/**
 * Creates in-app daily summary alerts only for each field whose latest score is
 * moderate or severe. It never includes optimal or mild fields.
 */
export async function runDailyStressSummary(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("The AgriNova data store is not available.");
  const [job] = await db.select().from(scheduledJobs).where(eq(scheduledJobs.scheduleCronTaskUid, taskUid)).limit(1);
  if (!job) return { ok: true, skipped: "orphan" } as const;
  if (job.lastRunDate === utcDate()) return { ok: true, skipped: "already-run" } as const;

  const scoredRows = await db
    .select({ fieldId: fields.id, fieldName: fields.name, ownerId: farms.userId, score: stressScores })
    .from(stressScores)
    .innerJoin(fields, eq(stressScores.fieldId, fields.id))
    .innerJoin(farms, eq(fields.farmId, farms.id))
    .where(eq(fields.status, "active"))
    .orderBy(desc(stressScores.recordedAt));

  const latestByField = new Map<number, (typeof scoredRows)[number]>();
  for (const row of scoredRows) {
    if (!latestByField.has(row.fieldId)) latestByField.set(row.fieldId, row);
  }
  const preferences = await db.select().from(notificationPreferences);
  const preferenceByUser = new Map(preferences.map(item => [item.userId, item.dailyStressSummaryEnabled]));
  let created = 0;

  for (const row of Array.from(latestByField.values())) {
    if (!isModerateOrSevere(row.score.riskLevel) || preferenceByUser.get(row.ownerId) === false) continue;
    const [alreadySent] = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(
        and(
          eq(alerts.fieldId, row.fieldId),
          eq(alerts.type, "daily_summary"),
          gte(alerts.createdAt, startOfUtcDay()),
        ),
      )
      .limit(1);
    if (alreadySent) continue;

    await db.insert(alerts).values({
      fieldId: row.fieldId,
      type: "daily_summary",
      severity: row.score.riskLevel,
      message: `Daily water-stress summary: ${row.fieldName} is ${row.score.riskLevel} at ${row.score.score}/100. Review the current recommendation before irrigating.`,
    });
    created += 1;
  }

  await db.update(scheduledJobs).set({ lastRunDate: utcDate() }).where(eq(scheduledJobs.id, job.id));
  return { ok: true, created } as const;
}
