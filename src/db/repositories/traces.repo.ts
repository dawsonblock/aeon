import { getPgClient, isPg } from "../client";
import { traces } from "../schema";
import { localDb } from "../local_store";
import { eq, desc } from "drizzle-orm";

export async function createTrace(goal: string) {
  if (isPg()) {
    try {
      const db = getPgClient();
      const [newTrace] = await db.insert(traces).values({
        goal,
        status: "running",
        metrics: {},
      }).returning();
      return newTrace;
    } catch (err) {
      console.warn("Postgres insert failed, falling back to local file store:", err);
    }
  }
  return await localDb.insertTrace({
    goal,
    status: "running",
    outcome: null,
    metrics: {},
    end_time: null,
  });
}

export async function getTrace(traceId: string) {
  if (isPg()) {
    try {
      const db = getPgClient();
      const [trace] = await db.select().from(traces).where(eq(traces.trace_id, traceId));
      return trace || null;
    } catch (err) {
      console.warn("Postgres retrieve failed, falling back to local file store:", err);
    }
  }
  const all = await localDb.getTraces();
  return all.find((t) => t.trace_id === traceId) || null;
}

export async function listTraces(limit: number = 50) {
  if (isPg()) {
    try {
      const db = getPgClient();
      return await db.select().from(traces).orderBy(desc(traces.created_at)).limit(limit);
    } catch (err) {
      console.warn("Postgres query failed, falling back to local file store:", err);
    }
  }
  const all = await localDb.getTraces();
  return [...all].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export async function completeTrace(traceId: string, outcome: string, metrics: Record<string, any> = {}) {
  const endTime = new Date().toISOString();
  if (isPg()) {
    try {
      const db = getPgClient();
      const [updated] = await db
        .update(traces)
        .set({
          status: "completed",
          outcome,
          metrics,
          end_time: new Date(endTime),
        })
        .where(eq(traces.trace_id, traceId))
        .returning();
      return updated || null;
    } catch (err) {
      console.warn("Postgres update failed, falling back to local file store:", err);
    }
  }
  return await localDb.updateTrace(traceId, {
    status: "completed",
    outcome,
    metrics,
    end_time: endTime,
  });
}
