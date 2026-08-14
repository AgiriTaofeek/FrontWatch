import type { Context } from "./context";

// The SDK-side event envelope. Deliberately smaller than the full
// ClickHouse row in data-model.md §3 — organization_id/application_id/
// environment_id/project_id are NOT here. The SDK only ever knows its
// public key; ingestion resolves and attaches those tenant IDs
// server-side (data-model.md §10: never trust a frontend-selected
// tenant ID).
//
// Three event types now (error, network, performance) — a real
// discriminated union, per this file's own earlier comment that said
// to do this "when a second event_type is real." breadcrumb/navigation/
// interaction get added the same way when their instrumentation
// modules exist, not speculatively now.

export type EventType = "error" | "network" | "performance";

export interface ErrorPayload {
	message: string;
	exceptionType: string;
	stackTrace?: string;
	handled: boolean;
	source?: {
		filename?: string;
		line?: number;
		column?: number;
	};
}

// instrumentation.md §Network: safe metadata only — never request/
// response bodies. resource is pre-normalized (dynamic segments ->
// placeholders) before it's ever attached to an event.
export interface NetworkPayload {
	method: string;
	resource: string;
	status: number;
	durationMs: number;
	outcome: "success" | "failure";
}

// instrumentation.md §Performance lists LCP/CLS/INP/FCP/TTFB as the
// first five metrics — navigation timing, resource timing, and long
// tasks are real, separate work, deferred not forgotten (same "fetch
// alone covers the modern case, XHR is separate work" split
// network.ts already made). metricName/rating/value/navigationType
// mirror web-vitals' own Metric type directly (performance.ts is a
// thin adapter over it, not a reimplementation).
export interface PerformancePayload {
	metricName: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
	value: number;
	rating: "good" | "needs-improvement" | "poor";
	navigationType: string;
}

interface FrontwatchEventBase {
	eventId: string;
	schemaVersion: 1;
	clientTimestamp: string;
	context: Context;
}

export type FrontwatchEvent =
	| (FrontwatchEventBase & { eventType: "error"; payload: ErrorPayload })
	| (FrontwatchEventBase & { eventType: "network"; payload: NetworkPayload })
	| (FrontwatchEventBase & {
			eventType: "performance";
			payload: PerformancePayload;
	  });

// Two constructors, not one generic — a shared generic here would need
// a type-unsafe cast at the return, since TS can't verify a generic
// eventType/payload pair actually match one union member. Two small,
// fully type-checked functions instead (services.md's "avoid
// over-abstraction" principle applies just as well to the SDK).

export function createErrorEvent(
	payload: ErrorPayload,
	context: Context,
): FrontwatchEvent {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: 1,
		eventType: "error",
		clientTimestamp: new Date().toISOString(),
		context,
		payload,
	};
}

export function createNetworkEvent(
	payload: NetworkPayload,
	context: Context,
): FrontwatchEvent {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: 1,
		eventType: "network",
		clientTimestamp: new Date().toISOString(),
		context,
		payload,
	};
}

export function createPerformanceEvent(
	payload: PerformancePayload,
	context: Context,
): FrontwatchEvent {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: 1,
		eventType: "performance",
		clientTimestamp: new Date().toISOString(),
		context,
		payload,
	};
}
