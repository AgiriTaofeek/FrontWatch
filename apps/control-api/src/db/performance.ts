import type { PerformanceMetricSummary } from "@frontwatch/contracts";
import { clickhouse } from "./clickhouse";

// Same ADR-023 shape as db/issues.ts and db/network.ts: no materialized
// table, GROUP BY over the raw events the Go worker already wrote (Step
// 7). Grouping key is metric_name — a project's LCP samples all
// describe the same thing, unlike network's (method, resource) which
// needs both to mean anything.
//
// value/rating live inside the raw `payload` JSON string column, not
// their own columns (ADR-008: payload stays raw evidence) — pulled out
// per-row with ClickHouse's JSONExtract* functions rather than parsed
// application-side, since the aggregation (count/quantile) has to run
// in ClickHouse anyway. p50/p75 (not p95, unlike network's durations)
// matches how Web Vitals are conventionally reported — CrUX/PageSpeed
// both score a page on its 75th percentile, not its worst case.

interface PerformanceMetricRow {
	metric_name: string;
	sample_count: string;
	p50_value: number;
	p75_value: number;
	good_count: string;
	needs_improvement_count: string;
	poor_count: string;
	last_seen_at: string;
}

function toSummary(row: PerformanceMetricRow): PerformanceMetricSummary {
	const sampleCount = Number(row.sample_count);
	const goodCount = Number(row.good_count);

	return {
		metricName: row.metric_name as PerformanceMetricSummary["metricName"],
		sampleCount,
		p50Value: row.p50_value,
		p75Value: row.p75_value,
		goodCount,
		needsImprovementCount: Number(row.needs_improvement_count),
		poorCount: Number(row.poor_count),
		// sampleCount is never 0 here — GROUP BY only produces rows that
		// have at least one occurrence.
		goodRate: goodCount / sampleCount,
		lastSeenAt: row.last_seen_at,
	};
}

export interface ListPerformanceMetricsFilters {
	route?: string;
	from?: string;
	to?: string;
}

// Not in api-contracts.md at all (written before Performance had a real
// backend view, Step 7) — same project-scoped shape the Network/Session
// deviations already established, for the same reason. No `limit` here
// unlike issues/network/sessions: there are only ever five possible
// metric_name values (instrumentation.md's Core Web Vitals list), so
// GROUP BY metric_name can never return more rows than that regardless
// of event volume — a page-size limit would be meaningless.
export async function listPerformanceMetrics(
	projectId: string,
	filters: ListPerformanceMetricsFilters = {},
): Promise<PerformanceMetricSummary[]> {
	const conditions = [
		"project_id = {projectId:String}",
		"event_type = 'performance'",
	];
	const params: Record<string, unknown> = { projectId };

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
				JSONExtractString(payload, 'metric_name') AS metric_name,
				count() AS sample_count,
				quantile(0.5)(JSONExtractFloat(payload, 'value')) AS p50_value,
				quantile(0.75)(JSONExtractFloat(payload, 'value')) AS p75_value,
				countIf(JSONExtractString(payload, 'rating') = 'good') AS good_count,
				countIf(JSONExtractString(payload, 'rating') = 'needs-improvement') AS needs_improvement_count,
				countIf(JSONExtractString(payload, 'rating') = 'poor') AS poor_count,
				max(client_timestamp) AS last_seen_at
			FROM events
			WHERE ${conditions.join(" AND ")}
			GROUP BY metric_name
			ORDER BY metric_name ASC
		`,
		format: "JSONEachRow",
		query_params: params,
	});

	const rows = await result.json<PerformanceMetricRow>();
	return rows.map(toSummary);
}
