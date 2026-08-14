// The wire contract between the SDK and Go ingestion, matching
// docs/05-architecture/api-contracts.md §3-4 exactly. This is the
// canonical source both sides serialize to / validate against — field
// names are snake_case because that's the literal wire format, not a
// TypeScript convention choice.
//
// Three event types now (error, network, performance) — a real
// discriminated union instead of a single flat payload type, per Step
// 4's own comment that this should happen "when a second event_type is
// real." breadcrumb gets added the same way, alongside its
// instrumentation module, not speculatively now.

export type WireEventType = "error" | "network" | "performance";

export interface WireErrorPayload {
	message: string;
	exception_type: string;
	stack_trace?: string;
	// The backend owns final issue grouping (instrumentation.md) — the
	// SDK *can* provide a fingerprint hint, but doesn't build one yet.
	fingerprint?: string;
	handled: boolean;
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
