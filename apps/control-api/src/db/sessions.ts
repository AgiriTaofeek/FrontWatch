import type {
	SessionDetail,
	SessionEvent,
	SessionSummary,
} from "@frontwatch/contracts";
import { clickhouse } from "./clickhouse";

// Same ADR-023 shape as db/issues.ts and db/network.ts: no materialized
// Session table (data-model.md §Session notwithstanding) — every event
// already carries session_id, so a session overview is just another
// GROUP BY over the same raw events the worker writes. session-
// investigation.md's "Session view must show: session identifier,
// start/end time, route history ... relevant errors, network failures"
// is exactly what this aggregation + the timeline query below produce.
// browser/device from data-model.md's Session entity are still not
// populated — that needs real User-Agent parsing, which
// packages/sdk/src/context.ts's own comment already documents as
// deliberately not built yet (WireClient is never sent).

function sessionId(projectId: string, rawSessionId: string): string {
	return `${projectId}:${rawSessionId}`;
}

export function parseSessionId(
	sessionIdParam: string,
): { projectId: string; rawSessionId: string } | null {
	const separatorIndex = sessionIdParam.indexOf(":");
	if (separatorIndex === -1) {
		return null;
	}
	return {
		projectId: sessionIdParam.slice(0, separatorIndex),
		rawSessionId: sessionIdParam.slice(separatorIndex + 1),
	};
}

interface SessionSummaryRow {
	raw_session_id: string;
	started_at: string;
	last_seen_at: string;
	event_count: string;
	error_count: string;
	network_count: string;
	first_route: string;
	last_route: string;
}

function toSummary(projectId: string, row: SessionSummaryRow): SessionSummary {
	return {
		sessionId: sessionId(projectId, row.raw_session_id),
		startedAt: row.started_at,
		lastSeenAt: row.last_seen_at,
		eventCount: Number(row.event_count),
		errorCount: Number(row.error_count),
		networkCount: Number(row.network_count),
		firstRoute: row.first_route || null,
		lastRoute: row.last_route || null,
	};
}

const SESSION_SUMMARY_SELECT = `
	session_id AS raw_session_id,
	min(client_timestamp) AS started_at,
	max(client_timestamp) AS last_seen_at,
	count() AS event_count,
	countIf(event_type = 'error') AS error_count,
	countIf(event_type = 'network') AS network_count,
	argMin(route, client_timestamp) AS first_route,
	argMax(route, client_timestamp) AS last_route
`;

export interface ListSessionsFilters {
	from?: string;
	to?: string;
	limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Not in api-contracts.md at all (written before Session had a real
// backend view, Step 7) — same project-scoped shape the Network
// deviation already established, for the same reason.
export async function listSessions(
	projectId: string,
	filters: ListSessionsFilters = {},
): Promise<SessionSummary[]> {
	const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

	const conditions = ["project_id = {projectId:String}", "session_id != ''"];
	const params: Record<string, unknown> = { projectId, limit };

	if (filters.from) {
		conditions.push("client_timestamp >= {from:DateTime64(3)}");
		params.from = filters.from;
	}
	if (filters.to) {
		conditions.push("client_timestamp <= {to:DateTime64(3)}");
		params.to = filters.to;
	}

	const result = await clickhouse.query({
		query: `
			SELECT ${SESSION_SUMMARY_SELECT}
			FROM events
			WHERE ${conditions.join(" AND ")}
			GROUP BY session_id
			ORDER BY last_seen_at DESC
			LIMIT {limit:UInt32}
		`,
		format: "JSONEachRow",
		query_params: params,
	});

	const rows = await result.json<SessionSummaryRow>();
	return rows.map((row) => toSummary(projectId, row));
}

interface TimelineRow {
	event_id: string;
	event_type: "error" | "network" | "performance" | "navigation";
	occurred_at: string;
	route: string;
	payload: string;
}

// Widened from error|network to all four real event types alongside
// the navigation work — a real, previously-untracked gap found in the
// same pass: "performance" was never handled here at all, even though
// performance events have carried a session_id since Step 7. Confirmed
// the actual pre-existing bug this caused, not just inferred it: a
// performance event fell through to the network-shaped branch below
// (`${payload.method ?? "?"} ...`), which has no `method`/`resource`/
// `status` fields on a performance payload, silently printing
// "? ? -> ?" into every session timeline that included one.
function summarize(row: TimelineRow): string {
	try {
		const payload = JSON.parse(row.payload) as Record<string, unknown>;
		switch (row.event_type) {
			case "error":
				return String(payload.message ?? "(no message)");
			case "performance":
				return `${payload.metric_name ?? "?"}: ${payload.value ?? "?"}`;
			case "navigation":
				return `Navigation -> ${payload.to_route ?? "?"}`;
			default:
				return `${payload.method ?? "?"} ${payload.resource ?? "?"} -> ${payload.status ?? "?"}`;
		}
	} catch {
		// Malformed/unparseable payload shouldn't break the whole
		// timeline — a visibly-degraded summary beats a 500.
		return "(unavailable)";
	}
}

// A fixed recent window, same simplification issues.ts's
// getIssue/RECENT_OCCURRENCES_LIMIT already made for the same reason:
// full cursor-paginated event browsing is deferred, not built. Ordered
// ascending (oldest first) — unlike issue occurrences (newest first),
// a session is a "timeline," which reads chronologically per
// session-investigation.md.
const TIMELINE_LIMIT = 100;

export async function getSession(
	projectId: string,
	rawSessionId: string,
): Promise<SessionDetail | null> {
	const summaryResult = await clickhouse.query({
		query: `
			SELECT ${SESSION_SUMMARY_SELECT}
			FROM events
			WHERE project_id = {projectId:String} AND session_id = {sessionId:String}
			GROUP BY session_id
		`,
		format: "JSONEachRow",
		query_params: { projectId, sessionId: rawSessionId },
	});

	const rows = await summaryResult.json<SessionSummaryRow>();
	const summary = rows[0];
	if (!summary) {
		return null;
	}

	const timelineResult = await clickhouse.query({
		query: `
			SELECT event_id, event_type, client_timestamp AS occurred_at, route, payload
			FROM events
			WHERE project_id = {projectId:String} AND session_id = {sessionId:String}
			ORDER BY client_timestamp ASC
			LIMIT {limit:UInt32}
		`,
		format: "JSONEachRow",
		query_params: { projectId, sessionId: rawSessionId, limit: TIMELINE_LIMIT },
	});

	const timelineRows = await timelineResult.json<TimelineRow>();
	const timeline: SessionEvent[] = timelineRows.map((row) => ({
		eventId: row.event_id,
		eventType: row.event_type,
		occurredAt: row.occurred_at,
		route: row.route || null,
		summary: summarize(row),
	}));

	return { ...toSummary(projectId, summary), timeline };
}
