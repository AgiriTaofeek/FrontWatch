import { clickhouse } from "./clickhouse";

// ADR-023: issues are derived by GROUP BY over the events table (Go's
// worker writes there, Step 5) — no separate materialized table. The
// fingerprint from Step 5 is the stable identifier; issueId exposed by
// this API is "{projectId}:{fingerprint}" so /issues/:id is
// self-describing (project scope + fingerprint, no separate query
// param needed).

export interface IssueSummary {
	issueId: string;
	fingerprint: string;
	title: string;
	exceptionType: string;
	occurrenceCount: number;
	firstSeenAt: string;
	lastSeenAt: string;
	latestRelease: string | null;
	latestRoute: string | null;
}

interface IssueRow {
	fingerprint: string;
	occurrence_count: string;
	first_seen_at: string;
	last_seen_at: string;
	latest_payload: string;
	latest_release: string;
	latest_route: string;
}

function toSummary(projectId: string, row: IssueRow): IssueSummary {
	const payload = JSON.parse(row.latest_payload) as {
		message: string;
		exception_type: string;
	};

	return {
		issueId: `${projectId}:${row.fingerprint}`,
		fingerprint: row.fingerprint,
		title: payload.message,
		exceptionType: payload.exception_type,
		occurrenceCount: Number(row.occurrence_count),
		firstSeenAt: row.first_seen_at,
		lastSeenAt: row.last_seen_at,
		latestRelease: row.latest_release || null,
		latestRoute: row.latest_route || null,
	};
}

const ISSUE_SUMMARY_SELECT = `
	fingerprint,
	count() AS occurrence_count,
	min(client_timestamp) AS first_seen_at,
	max(client_timestamp) AS last_seen_at,
	argMax(payload, client_timestamp) AS latest_payload,
	argMax(release, client_timestamp) AS latest_release,
	argMax(route, client_timestamp) AS latest_route
`;

export interface ListIssuesFilters {
	release?: string;
	route?: string;
	from?: string;
	to?: string;
	limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// api-contracts.md documents this as GET /applications/{id}/issues —
// deliberately deviated to project-scoped instead: Application doesn't
// exist as a real entity yet (Step 2's nullable-FK shortcut), and
// project_id is what events are actually keyed by. Tracked in
// PROGRESS.md's deviations log, not silent.
export async function listIssues(
	projectId: string,
	filters: ListIssuesFilters = {},
): Promise<IssueSummary[]> {
	const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

	const conditions = [
		"project_id = {projectId:String}",
		"event_type = 'error'",
		"fingerprint != ''",
	];
	const params: Record<string, unknown> = { projectId, limit };

	if (filters.release) {
		conditions.push("release = {release:String}");
		params.release = filters.release;
	}
	if (filters.route) {
		conditions.push("route = {route:String}");
		params.route = filters.route;
	}
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
			SELECT ${ISSUE_SUMMARY_SELECT}
			FROM events
			WHERE ${conditions.join(" AND ")}
			GROUP BY fingerprint
			ORDER BY last_seen_at DESC
			LIMIT {limit:UInt32}
		`,
		format: "JSONEachRow",
		query_params: params,
	});

	const rows = await result.json<IssueRow>();
	return rows.map((row) => toSummary(projectId, row));
}

export interface OccurrenceSummary {
	eventId: string;
	occurredAt: string;
	release: string | null;
	route: string | null;
	sessionId: string | null;
}

export interface IssueDetail extends IssueSummary {
	recentOccurrences: OccurrenceSummary[];
}

interface OccurrenceRow {
	event_id: string;
	occurred_at: string;
	release: string;
	route: string;
	session_id: string;
}

// api-contracts.md's GET /issues/{id}/occurrences is cursor-paginated
// and separate from issue detail. Simplified for MVP: a fixed recent
// window embedded directly in the detail response (one round trip,
// enough for error-investigation.md's "timeline" requirement) —
// full cursor-paginated occurrence browsing is deferred, not built.
const RECENT_OCCURRENCES_LIMIT = 20;

export async function getIssue(
	projectId: string,
	fingerprint: string,
): Promise<IssueDetail | null> {
	const summaryResult = await clickhouse.query({
		query: `
			SELECT ${ISSUE_SUMMARY_SELECT}
			FROM events
			WHERE project_id = {projectId:String} AND fingerprint = {fingerprint:String}
			GROUP BY fingerprint
		`,
		format: "JSONEachRow",
		query_params: { projectId, fingerprint },
	});

	const rows = await summaryResult.json<IssueRow>();
	if (rows.length === 0) {
		return null;
	}

	const occurrencesResult = await clickhouse.query({
		query: `
			SELECT event_id, client_timestamp AS occurred_at, release, route, session_id
			FROM events
			WHERE project_id = {projectId:String} AND fingerprint = {fingerprint:String}
			ORDER BY client_timestamp DESC
			LIMIT {limit:UInt32}
		`,
		format: "JSONEachRow",
		query_params: { projectId, fingerprint, limit: RECENT_OCCURRENCES_LIMIT },
	});

	const occurrenceRows = await occurrencesResult.json<OccurrenceRow>();

	const summary = rows[0];
	if (!summary) {
		return null;
	}

	return {
		...toSummary(projectId, summary),
		recentOccurrences: occurrenceRows.map((row) => ({
			eventId: row.event_id,
			occurredAt: row.occurred_at,
			release: row.release || null,
			route: row.route || null,
			sessionId: row.session_id || null,
		})),
	};
}

export function parseIssueId(
	issueId: string,
): { projectId: string; fingerprint: string } | null {
	const separatorIndex = issueId.indexOf(":");
	if (separatorIndex === -1) {
		return null;
	}
	return {
		projectId: issueId.slice(0, separatorIndex),
		fingerprint: issueId.slice(separatorIndex + 1),
	};
}
