import type { NavigationTransitionSummary } from "@frontwatch/contracts";
import { clickhouse } from "./clickhouse";

// Same ADR-023 shape as db/network.ts: no materialized table, GROUP BY
// over the raw events the Go worker already wrote. Grouping key is
// (from_route, to_route), not navigation_type (push/replace/pop) —
// "how do users move between routes" doesn't care which History API
// call produced a given transition.
//
// from_route/to_route live inside the raw `payload` JSON string
// column, not their own columns (ADR-008: payload stays raw evidence)
// — pulled out per-row with ClickHouse's JSONExtractString rather than
// parsed application-side, since the aggregation (count) has to run in
// ClickHouse anyway.

interface NavigationTransitionRow {
	from_route: string;
	to_route: string;
	transition_count: string;
	last_seen_at: string;
}

function toSummary(row: NavigationTransitionRow): NavigationTransitionSummary {
	return {
		fromRoute: row.from_route || null,
		toRoute: row.to_route,
		transitionCount: Number(row.transition_count),
		lastSeenAt: row.last_seen_at,
	};
}

export interface ListNavigationTransitionsFilters {
	release?: string;
	from?: string;
	to?: string;
	limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Not in api-contracts.md at all (written before Navigation had a real
// backend view) — same project-scoped pattern as Network/Performance's
// own deviations, for the same reason (project_id is what events are
// keyed by).
export async function listNavigationTransitions(
	projectId: string,
	filters: ListNavigationTransitionsFilters = {},
): Promise<NavigationTransitionSummary[]> {
	const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

	const conditions = [
		"project_id = {projectId:String}",
		"event_type = 'navigation'",
	];
	const params: Record<string, unknown> = { projectId, limit };

	if (filters.release) {
		conditions.push("release = {release:String}");
		params.release = filters.release;
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
				JSONExtractString(payload, 'from_route') AS from_route,
				JSONExtractString(payload, 'to_route') AS to_route,
				count() AS transition_count,
				max(client_timestamp) AS last_seen_at
			FROM events
			WHERE ${conditions.join(" AND ")}
			GROUP BY from_route, to_route
			ORDER BY transition_count DESC
			LIMIT {limit:UInt32}
		`,
		format: "JSONEachRow",
		query_params: params,
	});

	const rows = await result.json<NavigationTransitionRow>();
	return rows.map(toSummary);
}
