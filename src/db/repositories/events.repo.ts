import { getPgClient, isPg } from "../client";
import { events } from "../schema";
import { localDb } from "../local_store";
import { eq, asc } from "drizzle-orm";

export interface AppendEventInput {
  trace_id: string;
  parent_event_id?: string | null;
  actor: string;
  event_type: string;
  payload?: any;
  embedding?: number[] | null;
}

export async function appendEvent(input: AppendEventInput) {
  if (isPg()) {
    try {
      const db = getPgClient();
      const [newEvent] = await db.insert(events).values({
        trace_id: input.trace_id,
        parent_event_id: input.parent_event_id || null,
        actor: input.actor,
        event_type: input.event_type,
        payload: input.payload || {},
        embedding: input.embedding || null,
      }).returning();
      return newEvent;
    } catch (err) {
      console.warn("Postgres event append failed, falling back to local file store:", err);
    }
  }
  return await localDb.insertEvent({
    trace_id: input.trace_id,
    parent_event_id: input.parent_event_id || null,
    actor: input.actor,
    event_type: input.event_type,
    payload: input.payload || {},
    embedding: input.embedding || null,
  });
}

export async function getEvent(eventId: string) {
  if (isPg()) {
    try {
      const db = getPgClient();
      const [event] = await db.select().from(events).where(eq(events.event_id, eventId));
      return event || null;
    } catch (err) {
      console.warn("Postgres event get failed, falling back to local file store:", err);
    }
  }
  const all = await localDb.getEvents();
  return all.find((e) => e.event_id === eventId) || null;
}

export async function getEventsForTrace(traceId: string) {
  if (isPg()) {
    try {
      const db = getPgClient();
      return await db.select().from(events).where(eq(events.trace_id, traceId)).orderBy(asc(events.timestamp));
    } catch (err) {
      console.warn("Postgres event fetch failed, falling back to local file store:", err);
    }
  }
  const all = await localDb.getEvents();
  return all
    .filter((e) => e.trace_id === traceId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Ensure database updates are strictly prohibited
export function updateEvent(eventId: string, updates: any) {
  throw new Error("events table is append-only");
}

export function deleteEvent(eventId: string) {
  throw new Error("events table is append-only");
}
