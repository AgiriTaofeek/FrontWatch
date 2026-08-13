// The wire contract between the SDK and Go ingestion, matching
// docs/05-architecture/api-contracts.md §3-4 exactly. This is the
// canonical source both sides serialize to / validate against — field
// names are snake_case because that's the literal wire format, not a
// TypeScript convention choice.
//
// Only "error" exists as a payload type so far, same scoping as the SDK
// skeleton (packages/sdk) — network/performance/breadcrumb get added
// alongside their instrumentation modules, not speculatively now.

export type WireEventType = "error";

export interface WireErrorPayload {
	message: string;
	exception_type: string;
	stack_trace?: string;
	// The backend owns final issue grouping (instrumentation.md) — the
	// SDK *can* provide a fingerprint hint, but doesn't build one yet.
	fingerprint?: string;
	handled: boolean;
}

export interface WireClient {
	browser?: string;
	browser_version?: string;
	os?: string;
	device?: string;
}

export interface WireEvent {
	event_id: string;
	event_type: WireEventType;
	timestamp: string;
	release?: string;
	session_id?: string;
	route?: string;
	// Omitted entirely (not just sent empty) until real UA parsing exists
	// — sending a wrongly-shaped partial object would be worse than
	// omitting an optional field. See packages/sdk's deferred-scope note.
	client?: WireClient;
	payload: WireErrorPayload;
}

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
