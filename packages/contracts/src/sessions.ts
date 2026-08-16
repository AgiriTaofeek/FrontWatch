// The control-api <-> web contract for the Session API — same
// reasoning as issues.ts/network.ts: apps/control-api defines these
// shapes by returning them, apps/web consumes the same types instead of
// a separately hand-maintained copy that could drift.

export interface SessionSummary {
	// "{projectId}:{session_id}" composite, same pattern as
	// IssueSummary.issueId — a session detail page is a flat
	// /sessions/:sessionId resource, not nested under project, so it
	// needs to be self-describing the same way an issue id is.
	sessionId: string;
	startedAt: string;
	lastSeenAt: string;
	eventCount: number;
	errorCount: number;
	networkCount: number;
	firstRoute: string | null;
	lastRoute: string | null;
}

export interface SessionEvent {
	eventId: string;
	// Widened from "error" | "network" alongside the navigation work —
	// a real, previously-untracked gap found in the same pass: this
	// union never included "performance" either, even though
	// performance events have carried a session_id since Step 7. A
	// performance event landing in a session's timeline silently fell
	// through db/sessions.ts's summarize() to the network-shaped
	// fallback branch, printing "undefined undefined -> undefined" —
	// found and fixed here, not left as a second half-measure.
	eventType: "error" | "network" | "performance" | "navigation";
	occurredAt: string;
	route: string | null;
	// Human-readable one-liner: the error message, "GET /api/x -> 200"
	// for a network event, "LCP: 1800" for a performance sample, or
	// "Navigation -> /accounts" for a navigation event — built
	// server-side from the raw payload so apps/web doesn't need its own
	// copy of "how to summarize an event."
	summary: string;
}

export interface SessionDetail extends SessionSummary {
	timeline: SessionEvent[];
}

export interface ListSessionsResponse {
	sessions: SessionSummary[];
}
