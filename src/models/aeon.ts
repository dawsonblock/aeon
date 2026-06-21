import { z } from "zod";

export const TraceSchema = z.object({
  trace_id: z.string().uuid(),
  goal: z.string(),
  status: z.string().default("running"),
  outcome: z.string().optional(),
  start_time: z.string(),
  end_time: z.string().optional(),
  metrics: z.record(z.string(), z.any()).default({}),
  created_at: z.string(),
});

export const EventSchema = z.object({
  event_id: z.string().uuid(),
  trace_id: z.string().uuid(),
  parent_event_id: z.string().uuid().optional(),
  actor: z.string(),
  event_type: z.string(),
  payload: z.record(z.string(), z.any()).default({}),
  timestamp: z.string(),
  created_at: z.string(),
});
