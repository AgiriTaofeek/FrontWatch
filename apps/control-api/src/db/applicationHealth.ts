import type { ApplicationHealth, TelemetryStatus } from "@frontwatch/contracts";
import { desc, eq } from "drizzle-orm";
import { clickhouse, toClickHouseDateTime64 } from "./clickhouse";
import { db } from "./client";
import { listPerformanceMetrics } from "./performance";
import { releases } from "./schema";

// health-monitoring.md: "give engineers and CTOs a fast answer to 'is
// the application healthy right now?'" — one aggregation composing the
// same signals Issues/Network/Performance/Releases already expose
// individually, per US-12.01's acceptance criteria (error/performance/
// network/release health all represented, the time window is clear).
// Distinct from routes/health.ts's (lib/health.ts) internal-
// observability liveness/readiness checks — this is about the
// *monitored application's* health, not control-api's own.

const DEFAULT_WINDOW_MINUTES = 60;

interface LastEventRow {
	last_event_at: string;
}

interface ErrorWindowRow {
	current_count: string;
	previous_count: string;
	issue_count: string;
}

interface NetworkWindowRow {
	request_count: string;
	failure_count: string;
}

export async function getApplicationHealth(
	projectId: string,
	windowMinutes: number = DEFAULT_WINDOW_MINUTES,
): Promise<ApplicationHealth> {
	const now = new Date();
	const windowStart = new Date(now.getTime() - windowMinutes * 60_000);
	const previousWindowStart = new Date(
		windowStart.getTime() - windowMinutes * 60_000,
	);

	// Latest release is independent of telemetry status — a release can
	// be registered (Step 7) before any telemetry tagged with it ever
	// arrives, so this is fetched unconditionally, not gated below.
	const [latestReleaseRow] = await db
		.select()
		.from(releases)
		.where(eq(releases.projectId, projectId))
		.orderBy(desc(releases.deployedAt))
		.limit(1);
	const latestRelease = latestReleaseRow
		? {
				version: latestReleaseRow.version,
				deployedAt: latestReleaseRow.deployedAt.toISOString(),
			}
		: null;

	const lastEventResult = await clickhouse.query({
		query: `
			SELECT max(client_timestamp) AS last_event_at
			FROM events
			WHERE project_id = {projectId:String}
		`,
		format: "JSONEachRow",
		query_params: { projectId },
	});
	const [lastEventRow] = await lastEventResult.json<LastEventRow>();
	// A project with zero events ever still returns one row from this
	// global aggregate — max() over nothing is ClickHouse's zero-value
	// DateTime64 ("1970-01-01..."), not a genuinely absent row, so this
	// checks for that sentinel rather than an empty result set.
	const lastEventAt =
		lastEventRow?.last_event_at &&
		!lastEventRow.last_event_at.startsWith("1970")
			? lastEventRow.last_event_at
			: null;

	const telemetryStatus: TelemetryStatus = !lastEventAt
		? "no_telemetry"
		: new Date(`${lastEventAt.replace(" ", "T")}Z`) < windowStart
			? "stale"
			: "healthy";

	// Both "no telemetry ever" and "telemetry exists but none in the
	// current window" (stale) skip the window queries below — the window
	// genuinely has zero events either way, and running the queries would
	// just confirm that with real zeros. Returning those zeros as if they
	// were a meaningful "0 errors this window" result is exactly the
	// blurring health-monitoring.md's own critical distinction forbids:
	// a lack of data must never render identically to "checked, healthy."
	if (telemetryStatus !== "healthy") {
		return {
			telemetryStatus,
			windowMinutes,
			lastEventAt,
			errors: null,
			network: null,
			performanceMetrics: null,
			latestRelease,
		};
	}

	const [errorResult, networkResult, performanceMetrics] = await Promise.all([
		clickhouse.query({
			query: `
				SELECT
					countIf(client_timestamp >= {windowStart:DateTime64(3)}) AS current_count,
					countIf(client_timestamp >= {previousWindowStart:DateTime64(3)} AND client_timestamp < {windowStart:DateTime64(3)}) AS previous_count,
					uniqExactIf(fingerprint, fingerprint != '' AND client_timestamp >= {windowStart:DateTime64(3)}) AS issue_count
				FROM events
				WHERE project_id = {projectId:String}
					AND event_type = 'error'
					AND client_timestamp >= {previousWindowStart:DateTime64(3)}
			`,
			format: "JSONEachRow",
			query_params: {
				projectId,
				windowStart: toClickHouseDateTime64(windowStart),
				previousWindowStart: toClickHouseDateTime64(previousWindowStart),
			},
		}),
		// A dedicated aggregate, not a sum over listNetworkResources' per-
		// (method,resource) rows — same reasoning getReleaseHealth's own
		// network query already documents: this only needs the overall
		// failure rate, not a breakdown finer than that.
		clickhouse.query({
			query: `
				SELECT
					count() AS request_count,
					countIf(JSONExtractString(payload, 'outcome') = 'failure') AS failure_count
				FROM events
				WHERE project_id = {projectId:String}
					AND event_type = 'network'
					AND client_timestamp >= {windowStart:DateTime64(3)}
			`,
			format: "JSONEachRow",
			query_params: {
				projectId,
				windowStart: toClickHouseDateTime64(windowStart),
			},
		}),
		listPerformanceMetrics(projectId, {
			from: toClickHouseDateTime64(windowStart),
		}),
	]);

	const [errorRow] = await errorResult.json<ErrorWindowRow>();
	const [networkRow] = await networkResult.json<NetworkWindowRow>();

	const requestCount = Number(networkRow?.request_count ?? 0);
	const failureCount = Number(networkRow?.failure_count ?? 0);

	return {
		telemetryStatus,
		windowMinutes,
		lastEventAt,
		errors: {
			count: Number(errorRow?.current_count ?? 0),
			previousWindowCount: Number(errorRow?.previous_count ?? 0),
			issueCount: Number(errorRow?.issue_count ?? 0),
		},
		network: {
			requestCount,
			failureCount,
			// Guarded explicitly (a single always-present aggregate row, not
			// a GROUP BY that only ever produces non-empty groups) — same
			// pattern getReleaseHealth's own networkFailureRate uses.
			failureRate: requestCount === 0 ? 0 : failureCount / requestCount,
		},
		performanceMetrics,
		latestRelease,
	};
}
