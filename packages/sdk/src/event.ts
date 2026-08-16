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

// instrumentation.md §Breadcrumbs' full category list. "performance" is
// part of that vocabulary but not emitted automatically yet (no
// performance-breadcrumb source built in this pass — web-vitals'
// callbacks fire on their own timeline, not tied to a user action worth
// narrating) — kept in the type for forward compatibility rather than
// narrowed to only what's emitted today.
export type BreadcrumbCategory =
	| "navigation"
	| "interaction"
	| "network"
	| "error"
	| "performance"
	| "custom";

// Attached to an error's payload as the trail leading up to it
// (breadcrumbs.ts's bounded buffer) — not sent as its own event type,
// per the design confirmed with the user (see PROGRESS.md's Post-MVP
// gap closure section). `data` is deliberately untyped beyond
// Record<string, unknown> — privacy.ts redacts every string value in it
// the same way it redacts `message`, since instrumentation.md is
// explicit that breadcrumb metadata is just as sensitive-capable as any
// other telemetry field.
export interface Breadcrumb {
	category: BreadcrumbCategory;
	message: string;
	timestamp: string;
	data?: Record<string, unknown>;
}

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
	breadcrumbs?: Breadcrumb[];
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
