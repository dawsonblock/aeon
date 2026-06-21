import { describe, it, expect } from "vitest";
import { processChat } from "../src/services/chat.service";
import { getEventsForTrace } from "../src/db/repositories/events.repo";
import { getTrace } from "../src/db/repositories/traces.repo";

describe("AEON Event-Sourced Chat Service", () => {
  it("proves POST /chat without trace creates a trace, a trace_created event, a user_message, and an assistant_message", async () => {
    const goal = "Initiate bootstrap sequence";
    const res = await processChat({
      message: goal,
      traceId: null,
      metadata: {},
    });

    expect(res.traceId).toBeDefined();
    expect(res.eventIds.length).toBe(3); // trace_created, user_message, assistant_message
    expect(res.message).toBe("Trace created. I will plan next.");

    // Verify trace exists in database
    const trace = await getTrace(res.traceId);
    expect(trace).not.toBeNull();
    expect(trace?.goal).toBe(goal);

    // Verify events are in correct order
    const events = await getEventsForTrace(res.traceId);
    expect(events.length).toBe(3);
    expect(events[0].event_type).toBe("trace_created");
    expect(events[1].event_type).toBe("user_message");
    expect(events[2].event_type).toBe("assistant_message");
  });

  it("proves POST /chat with an existing trace ID appends incoming work directly to the same trace stream", async () => {
    // 1. First prompt to spawn trace
    const setup = await processChat({
      message: "Build a particle grid",
      traceId: null,
      metadata: {},
    });
    const traceId = setup.traceId;

    // 2. Continuous follow up message
    const res = await processChat({
      message: "Calibrate secondary grid sensors",
      traceId: traceId,
      metadata: {},
    });

    expect(res.traceId).toBe(traceId);
    expect(res.eventIds.length).toBe(2); // user_message, assistant_message
    expect(res.message).toBe("Message recorded.");

    // Verify entire audit log contains exactly 5 events (3 from setup + 2 from followup)
    const allEvents = await getEventsForTrace(traceId);
    expect(allEvents.length).toBe(5);
    
    // Check timeline sequence
    expect(allEvents[0].event_type).toBe("trace_created");
    expect(allEvents[1].event_type).toBe("user_message");
    expect(allEvents[2].event_type).toBe("assistant_message");
    expect(allEvents[3].event_type).toBe("user_message");
    expect(allEvents[3].payload.message).toBe("Calibrate secondary grid sensors");
    expect(allEvents[4].event_type).toBe("assistant_message");
    expect(allEvents[4].payload.message).toBe("Message recorded.");
  });
});
