import type { ReleaseHealth } from "@frontwatch/contracts";
import { and, eq } from "drizzle-orm";
import { clickhouse } from "./clickhouse";
import { db } from "./client";
import { listPerformanceMetrics } from "./performance";
import { releases } from "./schema";

// release-investigation.md's "did this release change production
// behavior?" question, answered by joining the Postgres release row
// (deployment metadata) against ClickHouse events filtered to
// `release = version` — the same free-text string every event already
// carries (Step 4's SdkConfig.release), no new correlation ID needed.
//
// Reuses listPerformanceMetrics rather than duplicating its quantile
// logic — the only new ClickHouse queries here are the error/issue and
// network aggregates, which don't have an existing list* function to
// reuse (network's own listNetworkResources groups by (method,
// resource), a finer breakdown than release health needs).

interface ErrorAggregateRow {
	error_count: string;
	issue_count: string;
}

interface NetworkAggregateRow {
	network_request_count: string;
	network_failure_count: string;
}

export async function getReleaseHealth(
	projectId: string,
	version: string,
): Promise<ReleaseHealth | null> {
	const [release] = await db
		.select()
		.from(releases)
		.where(
			and(eq(releases.projectId, projectId), eq(releases.version, version)),
		);

	if (!release) {
		return null;
	}

	const [errorResult, networkResult, performanceMetrics] = await Promise.all([
		clickhouse.query({
			query: `
				SELECT
					count() AS error_count,
					uniqExactIf(fingerprint, fingerprint != '') AS issue_count
				FROM events
				WHERE project_id = {projectId:String} AND event_type = 'error' AND release = {release:String}
			`,
			format: "JSONEachRow",
			query_params: { projectId, release: version },
		}),
		clickhouse.query({
			query: `
				SELECT
					count() AS network_request_count,
					countIf(JSONExtractString(payload, 'outcome') = 'failure') AS network_failure_count
				FROM events
				WHERE project_id = {projectId:String} AND event_type = 'network' AND release = {release:String}
			`,
			format: "JSONEachRow",
			query_params: { projectId, release: version },
		}),
		listPerformanceMetrics(projectId, { release: version }),
	]);

	const [errorRow] = await errorResult.json<ErrorAggregateRow>();
	const [networkRow] = await networkResult.json<NetworkAggregateRow>();

	const networkRequestCount = Number(networkRow?.network_request_count ?? 0);
	const networkFailureCount = Number(networkRow?.network_failure_count ?? 0);

	return {
		id: release.id,
		projectId: release.projectId,
		version: release.version,
		commitSha: release.commitSha,
		deployedAt: release.deployedAt.toISOString(),
		createdAt: release.createdAt.toISOString(),
		errorCount: Number(errorRow?.error_count ?? 0),
		issueCount: Number(errorRow?.issue_count ?? 0),
		networkRequestCount,
		networkFailureCount,
		// Guarded explicitly, not just "never 0 because GROUP BY only
		// returns real rows" — unlike listNetworkResources, this is a
		// single always-present aggregate row (count() over zero matching
		// events is still a row, just with count 0), so a release with no
		// network telemetry yet is a real, expected case here.
		networkFailureRate:
			networkRequestCount === 0 ? 0 : networkFailureCount / networkRequestCount,
		performanceMetrics,
	};
}
