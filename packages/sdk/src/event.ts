import type { Context } from "./context";

// The SDK-side event envelope. Deliberately smaller than the full
// ClickHouse row in data-model.md §3 — organization_id/application_id/
// environment_id/project_id are NOT here. The SDK only ever knows its
// public key; ingestion resolves and attaches those tenant IDs
// server-side (data-model.md §10: never trust a frontend-selected
// tenant ID).
//
// Four event types now (error, network, performance, navigation) — a
// real discriminated union, per this file's own earlier comment that
// said to do this "when a second event_type is real." breadcrumb stays
// out of this union deliberately (attached to ErrorPayload instead, see
// Breadcrumb below) — a real design decision, not an oversight.

export type EventType = "error" | "network" | "performance" | "navigation";

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

// instrumentation.md §Navigation: "Captures client-side route
// transitions (SPA)... Event shape: {event_type: "navigation",
// from_route, to_route, navigation_type}." A standalone, independently-
// queryable event — distinct from breadcrumbs.ts's "navigation"
// category breadcrumb, which is a trail entry attached to a *future
// error*, not something investigable on its own. Both fire from the
// same underlying History API patch in navigation.ts; this is the
// other, real half of what that instrumentation.md section asks for
// (PROGRESS.md's Post-MVP gap closure list tracked this gap
// separately from breadcrumbs' navigation category for exactly this
// reason). fromRoute is null for the very first navigation this SDK
// instance observes — there is no prior route to report.
export interface NavigationPayload {
	fromRoute: string | null;
	toRoute: string;
	navigationType: "push" | "replace" | "pop";
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
	  })
	| (FrontwatchEventBase & {
			eventType: "navigation";
			payload: NavigationPayload;
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

export function createNavigationEvent(
	payload: NavigationPayload,
	context: Context,
): FrontwatchEvent {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: 1,
		eventType: "navigation",
		clientTimestamp: new Date().toISOString(),
		context,
		payload,
	};
}
