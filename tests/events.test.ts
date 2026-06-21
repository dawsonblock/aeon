import { describe, it, expect } from "vitest";
import { createTrace } from "../src/db/repositories/traces.repo";
import { appendEvent, getEvent, getEventsForTrace, updateEvent, deleteEvent } from "../src/db/repositories/events.repo";

describe("AEON Events Immutable Ledger", () => {
  it("proves an event can be appended and retrieved", async () => {
    const trace = await createTrace("Verification Test");
    const event = await appendEvent({
      trace_id: trace.trace_id,
      actor: "tester",
      event_type: "unit_test_event",
      payload: { pass: true },
    });

    expect(event.event_id).toBeDefined();
    expect(event.trace_id).toBe(trace.trace_id);
    expect(event.actor).toBe("tester");
    expect(event.event_type).toBe("unit_test_event");

    const retrieved = await getEvent(event.event_id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.payload).toEqual({ pass: true });
  });

  it("proves events are always returned in chronological (timestamp) order", async () => {
    const trace = await createTrace("Temporal Sorting Check");
    
    // Append 3 sequential events with slight gaps
    const e1 = await appendEvent({
      trace_id: trace.trace_id,
      actor: "engine",
      event_type: "step_1",
    });
    
    const e2 = await appendEvent({
      trace_id: trace.trace_id,
      actor: "engine",
      event_type: "step_2",
    });

    const e3 = await appendEvent({
      trace_id: trace.trace_id,
      actor: "engine",
      event_type: "step_3",
    });

    const timeline = await getEventsForTrace(trace.trace_id);
    expect(timeline.length).toBe(3);
    expect(timeline[0].event_id).toBe(e1.event_id);
    expect(timeline[1].event_id).toBe(e2.event_id);
    expect(timeline[2].event_id).toBe(e3.event_id);
  });

  it("proves direct event updates fail to preserve historical integrity", async () => {
    const trace = await createTrace("Security Lock Test");
    const event = await appendEvent({
      trace_id: trace.trace_id,
      actor: "adversary",
      event_type: "tamper_target",
    });

    // Directly attempting to update or mutate must fail
    expect(() => updateEvent(event.event_id, { event_type: "tampered" })).toThrow(/append-only/i);
  });

  it("proves direct event deletions fail to preserve historical integrity", async () => {
    const trace = await createTrace("Security Erasure Test");
    const event = await appendEvent({
      trace_id: trace.trace_id,
      actor: "adversary",
      event_type: "erase_target",
    });

    // Directly attempting to delete or prune must fail
    expect(() => deleteEvent(event.event_id)).toThrow(/append-only/i);
  });
});
