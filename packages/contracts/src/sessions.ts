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
	eventType: "error" | "network";
	occurredAt: string;
	route: string | null;
	// Human-readable one-liner: the error message, or "GET /api/x -> 200"
	// for a network event — built server-side from the raw payload so
	// apps/web doesn't need its own copy of "how to summarize an event."
	summary: string;
}

export interface SessionDetail extends SessionSummary {
	timeline: SessionEvent[];
}

export interface ListSessionsResponse {
	sessions: SessionSummary[];
}
