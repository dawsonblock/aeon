import { z } from "zod";

export const EventCreateSchema = z.object({
  trace_id: z.string().uuid("Invalid trace ID"),
  parent_event_id: z.string().uuid().nullable().optional(),
  actor: z.string().min(1, "Actor is required"),
  event_type: z.string().min(1, "Event type is required"),
  payload: z.record(z.string(), z.any()).default({}),
  embedding: z.array(z.number()).nullable().optional(),
});

export const EventReadSchema = z.object({
  event_id: z.string().uuid(),
  trace_id: z.string().uuid(),
  parent_event_id: z.string().uuid().nullable().optional(),
  actor: z.string(),
  event_type: z.string(),
  payload: z.record(z.string(), z.any()),
  timestamp: z.string(),
  created_at: z.string(),
  embedding: z.array(z.number()).nullable().optional(),
});

export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventRead = z.infer<typeof EventReadSchema>;
