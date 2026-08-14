import type { IngestRequest, WireEvent } from "@frontwatch/contracts";
import type { FrontwatchEvent } from "./event";

// Converts the SDK's internal event shape (camelCase, nested context —
// useful for buffer/privacy processing) into the documented wire
// contract (snake_case, flat — api-contracts.md §3-4). Kept as its own
// module rather than baked into event.ts, so the internal shape can
// keep evolving for internal-processing convenience without that
// leaking into what actually goes over the wire.
export function toWireEvent(event: FrontwatchEvent): WireEvent {
	const base = {
		event_id: event.eventId,
		timestamp: event.clientTimestamp,
		release: event.context.release,
		session_id: event.context.sessionId,
		route: event.context.route,
		// client (browser/os/device) omitted — no UA parsing yet, and it's
		// not in api-contracts.md's required-fields list. Sending a
		// wrongly-shaped partial object would be worse than omitting it.
	};

	if (event.eventType === "network") {
		return {
			...base,
			event_type: "network",
			payload: {
				method: event.payload.method,
				resource: event.payload.resource,
				status: event.payload.status,
				duration_ms: event.payload.durationMs,
				outcome: event.payload.outcome,
			},
		};
	}

	if (event.eventType === "performance") {
		return {
			...base,
			event_type: "performance",
			payload: {
				metric_name: event.payload.metricName,
				value: event.payload.value,
				rating: event.payload.rating,
				navigation_type: event.payload.navigationType,
			},
		};
	}

	return {
		...base,
		event_type: "error",
		payload: {
			message: event.payload.message,
			exception_type: event.payload.exceptionType,
			stack_trace: event.payload.stackTrace,
			handled: event.payload.handled,
		},
	};
}

export function toIngestRequest(events: FrontwatchEvent[]): IngestRequest {
	return {
		schema_version: 1,
		sent_at: new Date().toISOString(),
		events: events.map(toWireEvent),
	};
}
