import { z } from "zod";

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  traceId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const ChatResponseSchema = z.object({
  traceId: z.string().uuid(),
  eventIds: z.array(z.string().uuid()),
  message: z.string(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
