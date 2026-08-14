import type {
	IssueDetail,
	IssueSummary,
	OccurrenceSummary,
} from "@frontwatch/contracts";
import { clickhouse, toClickHouseDateTime64 } from "./clickhouse";

// ADR-023: issues are derived by GROUP BY over the events table (Go's
// worker writes there, Step 5) — no separate materialized table. The
// fingerprint from Step 5 is the stable identifier; issueId exposed by
// this API is "{projectId}:{fingerprint}" so /issues/:id is
// self-describing (project scope + fingerprint, no separate query
// param needed).
//
// Response shapes (IssueSummary/IssueDetail/OccurrenceSummary) live in
// packages/contracts, shared with apps/web — same lesson Step 4 already
// learned the hard way with the SDK/ingestion wire contract: one
// definition, not two that can quietly drift apart.

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

	const recentOccurrences: OccurrenceSummary[] = occurrenceRows.map((row) => ({
		eventId: row.event_id,
		occurredAt: row.occurred_at,
		release: row.release || null,
		route: row.route || null,
		sessionId: row.session_id || null,
	}));

	return { ...toSummary(projectId, summary), recentOccurrences };
}

// Step 8's alert-evaluator: "genuinely new" means first_seen_at is on
// or after `since` (a rule's own createdAt) — a rule created against a
// project with pre-existing issues must not fire for all of them at
// once just because they've never been alerted-on before. Reuses
// ISSUE_SUMMARY_SELECT/toSummary rather than a separate query shape,
// since a "new issue" is exactly an IssueSummary, just filtered
// differently than listIssues' paginated dashboard view.
export async function listNewIssues(
	projectId: string,
	since: Date,
): Promise<IssueSummary[]> {
	const result = await clickhouse.query({
		query: `
			SELECT ${ISSUE_SUMMARY_SELECT}
			FROM events
			WHERE project_id = {projectId:String} AND event_type = 'error' AND fingerprint != ''
			GROUP BY fingerprint
			HAVING first_seen_at >= {since:DateTime64(3)}
		`,
		format: "JSONEachRow",
		query_params: { projectId, since: toClickHouseDateTime64(since) },
	});

	const rows = await result.json<IssueRow>();
	return rows.map((row) => toSummary(projectId, row));
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
