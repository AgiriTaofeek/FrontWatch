import type { NetworkResourceSummary } from "@frontwatch/contracts";
import { clickhouse } from "./clickhouse";

// Same ADR-023 shape as db/issues.ts: no materialized table, GROUP BY
// over the raw events the Go worker already wrote (Step 5/7). Network
// events don't have a fingerprint (that's error-specific, Step 5's
// issue.Fingerprint), so the grouping key here is (method, resource)
// instead — packages/sdk's normalizeResource already collapsed
// /api/users/123 -> /api/users/:id client-side, so this GROUP BY
// doesn't need to redo that normalization server-side.
//
// duration_ms/status/outcome live inside the raw `payload` JSON string
// column, not their own columns (ADR-008: payload stays raw evidence) —
// pulled out per-row with ClickHouse's JSONExtract* functions rather
// than parsed application-side, since the aggregation (count/quantile)
// has to run in ClickHouse anyway.

interface NetworkResourceRow {
	method: string;
	resource: string;
	request_count: string;
	failure_count: string;
	p50_duration_ms: number;
	p95_duration_ms: number;
	last_seen_at: string;
}

function toSummary(row: NetworkResourceRow): NetworkResourceSummary {
	const requestCount = Number(row.request_count);
	const failureCount = Number(row.failure_count);

	return {
		method: row.method,
		resource: row.resource,
		requestCount,
		failureCount,
		// requestCount is never 0 here — GROUP BY only produces rows that
		// have at least one occurrence.
		failureRate: failureCount / requestCount,
		p50DurationMs: row.p50_duration_ms,
		p95DurationMs: row.p95_duration_ms,
		lastSeenAt: row.last_seen_at,
	};
}

export interface ListNetworkResourcesFilters {
	route?: string;
	from?: string;
	to?: string;
	limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Not in api-contracts.md at all (written before Network existed as a
// telemetry type, Step 7) — same project-scoped pattern as
// GET /projects/:projectId/issues, for the same reason (project_id is
// what events are actually keyed by). Tracked in PROGRESS.md's
// deviations log.
export async function listNetworkResources(
	projectId: string,
	filters: ListNetworkResourcesFilters = {},
): Promise<NetworkResourceSummary[]> {
	const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

	const conditions = [
		"project_id = {projectId:String}",
		"event_type = 'network'",
	];
	const params: Record<string, unknown> = { projectId, limit };

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
			SELECT
				JSONExtractString(payload, 'method') AS method,
				JSONExtractString(payload, 'resource') AS resource,
				count() AS request_count,
				countIf(JSONExtractString(payload, 'outcome') = 'failure') AS failure_count,
				quantile(0.5)(JSONExtractFloat(payload, 'duration_ms')) AS p50_duration_ms,
				quantile(0.95)(JSONExtractFloat(payload, 'duration_ms')) AS p95_duration_ms,
				max(client_timestamp) AS last_seen_at
			FROM events
			WHERE ${conditions.join(" AND ")}
			GROUP BY method, resource
			ORDER BY request_count DESC
			LIMIT {limit:UInt32}
		`,
		format: "JSONEachRow",
		query_params: params,
	});

	const rows = await result.json<NetworkResourceRow>();
	return rows.map(toSummary);
}
