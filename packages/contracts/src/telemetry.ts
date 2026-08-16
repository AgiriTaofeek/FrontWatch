// The wire contract between the SDK and Go ingestion, matching
// docs/05-architecture/api-contracts.md §3-4 exactly. This is the
// canonical source both sides serialize to / validate against — field
// names are snake_case because that's the literal wire format, not a
// TypeScript convention choice.
//
// Four event types now (error, network, performance, navigation) — a
// real discriminated union instead of a single flat payload type, per
// Step 4's own comment that this should happen "when a second
// event_type is real." breadcrumb is *not* a fifth event_type here,
// deliberately — per the design confirmed with the user (PROGRESS.md's
// Post-MVP gap closure section), breadcrumbs are a trail attached to an
// error's own payload, not sent as their own standalone event.

export type WireEventType = "error" | "network" | "performance" | "navigation";

// instrumentation.md §Breadcrumbs' category vocabulary — mirrors
// packages/sdk's BreadcrumbCategory exactly.
export type WireBreadcrumbCategory =
	| "navigation"
	| "interaction"
	| "network"
	| "error"
	| "performance"
	| "custom";

export interface WireBreadcrumb {
	category: WireBreadcrumbCategory;
	message: string;
	timestamp: string;
	data?: Record<string, unknown>;
}

export interface WireErrorPayload {
	message: string;
	exception_type: string;
	stack_trace?: string;
	// The backend owns final issue grouping (instrumentation.md) — the
	// SDK *can* provide a fingerprint hint, but doesn't build one yet.
	fingerprint?: string;
	handled: boolean;
	breadcrumbs?: WireBreadcrumb[];
}

// instrumentation.md §Network: "captures safe metadata only" — never
// request/response bodies, never raw high-cardinality URLs (resource
// is pre-normalized by the SDK, e.g. /api/users/123 -> /api/users/:id,
// before it ever reaches the wire).
export interface WireNetworkPayload {
	method: string;
	resource: string;
	status: number;
	duration_ms: number;
	outcome: "success" | "failure";
}

// instrumentation.md §Performance's first five metrics. Mirrors
// web-vitals' own Metric shape (name/value/rating/navigationType) —
// packages/sdk/src/performance.ts is a thin adapter over that library,
// not a reimplementation, so the wire shape follows it directly rather
// than inventing a parallel vocabulary.
export interface WirePerformancePayload {
	metric_name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
	value: number;
	rating: "good" | "needs-improvement" | "poor";
	navigation_type: string;
}

// instrumentation.md §Navigation: "Event shape: {event_type:
// "navigation", from_route, to_route, navigation_type}" — a standalone,
// independently-queryable event, distinct from a "navigation"-category
// breadcrumb (which is context attached to a future error's payload,
// not investigable on its own). from_route is absent (not sent as an
// empty string) for the very first navigation an SDK instance observes
// — there is no prior route to report.
export interface WireNavigationPayload {
	from_route?: string;
	to_route: string;
	navigation_type: "push" | "replace" | "pop";
}

export interface WireClient {
	browser?: string;
	browser_version?: string;
	os?: string;
	device?: string;
}

interface WireEventBase {
	event_id: string;
	timestamp: string;
	release?: string;
	session_id?: string;
	route?: string;
	// Omitted entirely (not just sent empty) until real UA parsing exists
	// — sending a wrongly-shaped partial object would be worse than
	// omitting an optional field. See packages/sdk's deferred-scope note.
	client?: WireClient;
}

export type WireEvent =
	| (WireEventBase & { event_type: "error"; payload: WireErrorPayload })
	| (WireEventBase & { event_type: "network"; payload: WireNetworkPayload })
	| (WireEventBase & {
			event_type: "performance";
			payload: WirePerformancePayload;
	  })
	| (WireEventBase & {
			event_type: "navigation";
			payload: WireNavigationPayload;
	  });

export interface IngestRequest {
	schema_version: 1;
	sent_at: string;
	events: WireEvent[];
}

export interface IngestRejection {
	event_id: string;
	code: string;
}

export interface IngestResponse {
	accepted: number;
	rejected: number;
	request_id: string;
	rejections?: IngestRejection[];
}
