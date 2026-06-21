import { z } from "zod";

export const TraceCreateSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
});

export const TraceReadSchema = z.object({
  trace_id: z.string().uuid(),
  goal: z.string(),
  status: z.string(),
  outcome: z.string().nullable().optional(),
  start_time: z.string(),
  end_time: z.string().nullable().optional(),
  metrics: z.record(z.string(), z.any()).or(z.string()),
  created_at: z.string(),
});

export type TraceCreate = z.infer<typeof TraceCreateSchema>;
export type TraceRead = z.infer<typeof TraceReadSchema>;
