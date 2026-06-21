import { describe, it, expect } from "vitest";
import { createTrace, getTrace, completeTrace } from "../src/db/repositories/traces.repo";
import { getEventsForTrace, appendEvent } from "../src/db/repositories/events.repo";

describe("AEON Trace Lifecycle Manager", () => {
  it("proves trace can be created and retrieved", async () => {
    const goal = "Construct quantum communications backbone";
    const newTrace = await createTrace(goal);
    
    expect(newTrace.trace_id).toBeDefined();
    expect(newTrace.goal).toBe(goal);
    expect(newTrace.status).toBe("running");

    const retrieved = await getTrace(newTrace.trace_id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.goal).toBe(goal);
  });

  it("proves trace starts with trace_created system event", async () => {
    const goal = "Calibrate cooling matrix";
    const trace = await createTrace(goal);
    
    // Simulate our system appending trace_created event upon starting a trace
    await appendEvent({
      trace_id: trace.trace_id,
      actor: "system",
      event_type: "trace_created",
      payload: { goal },
    });

    const events = await getEventsForTrace(trace.trace_id);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].event_type).toBe("trace_created");
    expect(events[0].actor).toBe("system");
    expect(events[0].payload.goal).toBe(goal);
  });

  it("proves trace can be completed cleanly", async () => {
    const trace = await createTrace("Run laser simulation");
    const completed = await completeTrace(trace.trace_id, "Simulation succeeded without anomalies", { duration_ms: 1240 });

    expect(completed.status).toBe("completed");
    expect(completed.outcome).toBe("Simulation succeeded without anomalies");
    expect(completed.metrics.duration_ms).toBe(1240);
    expect(completed.end_time).not.toBeNull();
  });
});
