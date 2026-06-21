import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface Trace {
  trace_id: string;
  goal: string;
  status: string;
  outcome: string | null;
  start_time: string;
  end_time: string | null;
  metrics: Record<string, any>;
  created_at: string;
}

export interface Event {
  event_id: string;
  trace_id: string;
  parent_event_id: string | null;
  actor: string;
  event_type: string;
  payload: Record<string, any>;
  timestamp: string;
  created_at: string;
  embedding?: number[] | null;
}

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ traces: [], events: [] }, null, 2));
  }
}

export function readDb(): { traces: Trace[]; events: Event[] } {
  ensureDbFile();
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return { traces: [], events: [] };
  }
}

export function writeDb(data: { traces: Trace[]; events: Event[] }) {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Emulate Postgres trigger constraints and client APIs
export const localDb = {
  async getTraces(): Promise<Trace[]> {
    return readDb().traces;
  },

  async insertTrace(trace: Omit<Trace, "trace_id" | "start_time" | "created_at"> & { trace_id?: string }): Promise<Trace> {
    const db = readDb();
    const newTrace: Trace = {
      trace_id: trace.trace_id || crypto.randomUUID(),
      goal: trace.goal,
      status: trace.status || "running",
      outcome: trace.outcome || null,
      start_time: new Date().toISOString(),
      end_time: trace.end_time || null,
      metrics: trace.metrics || {},
      created_at: new Date().toISOString(),
    };
    db.traces.push(newTrace);
    writeDb(db);
    return newTrace;
  },

  async updateTrace(traceId: string, updates: Partial<Omit<Trace, "trace_id">>): Promise<Trace> {
    const db = readDb();
    const traceIdx = db.traces.findIndex((t) => t.trace_id === traceId);
    if (traceIdx === -1) {
      throw new Error(`Trace with id ${traceId} not found`);
    }
    db.traces[traceIdx] = {
      ...db.traces[traceIdx],
      ...updates,
    };
    writeDb(db);
    return db.traces[traceIdx];
  },

  async getEvents(): Promise<Event[]> {
    return readDb().events;
  },

  async insertEvent(event: Omit<Event, "event_id" | "timestamp" | "created_at">): Promise<Event> {
    const db = readDb();
    const newEvent: Event = {
      event_id: crypto.randomUUID(),
      trace_id: event.trace_id,
      parent_event_id: event.parent_event_id || null,
      actor: event.actor,
      event_type: event.event_type,
      payload: event.payload || {},
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      embedding: event.embedding || null,
    };
    db.events.push(newEvent);
    writeDb(db);
    return newEvent;
  },

  // Rigid trigger emulator: blocking updates and deletes
  updateEvent(eventId: string, updates: any) {
    throw new Error("events table is append-only");
  },

  deleteEvent(eventId: string) {
    throw new Error("events table is append-only");
  }
};
