import { pgTable, uuid, text, timestamp, jsonb, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Support pgvector (1536 dimensions)
export const vector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: any) {
    if (typeof value === "string") {
      return value.slice(1, -1).split(",").map(Number);
    }
    return value;
  },
});

export const traces = pgTable("traces", {
  trace_id: uuid("trace_id").primaryKey().defaultRandom(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("running"),
  outcome: text("outcome"),
  start_time: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  end_time: timestamp("end_time", { withTimezone: true }),
  metrics: jsonb("metrics").notNull().default("{}"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  event_id: uuid("event_id").primaryKey().defaultRandom(),
  trace_id: uuid("trace_id")
    .notNull()
    .references(() => traces.trace_id),
  parent_event_id: uuid("parent_event_id"),
  actor: text("actor").notNull(),
  event_type: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default("{}"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  embedding: vector("embedding", { dimensions: 1536 }),
});
