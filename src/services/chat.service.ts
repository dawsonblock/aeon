import { createTrace, getTrace } from "../db/repositories/traces.repo";
import { appendEvent } from "../db/repositories/events.repo";
import { ChatRequest, ChatResponse } from "../schemas/chat.schema";

export async function processChat(request: ChatRequest): Promise<ChatResponse> {
  const { message, traceId, metadata } = request;

  if (!traceId) {
    // 1. Create a new trace using the message as the goal
    const trace = await createTrace(message);
    const id = trace.trace_id;

    // 2. Append trace_created event
    const event1 = await appendEvent({
      trace_id: id,
      actor: "system",
      event_type: "trace_created",
      payload: { goal: message },
    });

    // 3. Append user_message event
    const event2 = await appendEvent({
      trace_id: id,
      actor: "user",
      event_type: "user_message",
      payload: { message },
    });

    // 4. Append assistant_message event with message: "Trace created. I will plan next."
    const responseMsg = "Trace created. I will plan next.";
    const event3 = await appendEvent({
      trace_id: id,
      actor: "assistant",
      event_type: "assistant_message",
      payload: { message: responseMsg },
    });

    return {
      traceId: id,
      eventIds: [event1.event_id, event2.event_id, event3.event_id],
      message: responseMsg,
    };
  } else {
    // Check if the trace actually exists
    const trace = await getTrace(traceId);
    if (!trace) {
      throw new Error(`Trace with id ${traceId} not found`);
    }

    // 1. Append user_message event to the trace
    const event1 = await appendEvent({
      trace_id: traceId,
      actor: "user",
      event_type: "user_message",
      payload: { message },
    });

    // 2. Append assistant_message event with message: "Message recorded."
    const responseMsg = "Message recorded.";
    const event2 = await appendEvent({
      trace_id: traceId,
      actor: "assistant",
      event_type: "assistant_message",
      payload: { message: responseMsg },
    });

    return {
      traceId: traceId,
      eventIds: [event1.event_id, event2.event_id],
      message: responseMsg,
    };
  }
}
