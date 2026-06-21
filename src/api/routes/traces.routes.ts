import { Router } from "express";
import { createTrace, getTrace, listTraces } from "../../db/repositories/traces.repo";
import { getEventsForTrace, appendEvent } from "../../db/repositories/events.repo";
import { TraceCreateSchema } from "../../schemas/trace.schema";

const router = Router();

// POST /traces
router.post("/traces", async (req, res) => {
  try {
    const validated = TraceCreateSchema.parse(req.body);
    const trace = await createTrace(validated.goal);
    
    // Also append trace_created event
    await appendEvent({
      trace_id: trace.trace_id,
      actor: "system",
      event_type: "trace_created",
      payload: { goal: validated.goal },
    });

    res.status(201).json(trace);
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: error.message || "Failed to create trace" });
    }
  }
});

// GET /traces
router.get("/traces", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const items = await listTraces(limit);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to list traces" });
  }
});

// GET /traces/:traceId
router.get("/traces/:traceId", async (req, res) => {
  try {
    const trace = await getTrace(req.params.traceId);
    if (!trace) {
      res.status(404).json({ error: "Trace not found" });
      return;
    }
    res.json(trace);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get trace" });
  }
});

// GET /traces/:traceId/events
router.get("/traces/:traceId/events", async (req, res) => {
  try {
    const eventsList = await getEventsForTrace(req.params.traceId);
    res.json(eventsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to list trace events" });
  }
});

export default router;
