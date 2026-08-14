// The control-api <-> web contract for the Release API — same
// reasoning as issues.ts/network.ts: apps/control-api defines these
// shapes by returning them, apps/web consumes the same types instead
// of a separately hand-maintained copy that could drift.
//
// Unlike issues/network/sessions/performance, `ReleaseSummary` isn't a
// ClickHouse aggregation view — `releases` is a real Postgres table
// (Step 7's Release sub-item), so this shape mirrors a row, not a
// GROUP BY result. `ReleaseHealth` below is where the two worlds meet:
// the Postgres row joined against ClickHouse events filtered to
// `release = version` — release-investigation.md's "did this release
// change production behavior?" question, answered.

import type { PerformanceMetricSummary } from "./performance";

export interface ReleaseSummary {
	id: string;
	projectId: string;
	version: string;
	commitSha: string | null;
	deployedAt: string;
	createdAt: string;
}

export interface ListReleasesResponse {
	releases: ReleaseSummary[];
}

export interface ReleaseHealth extends ReleaseSummary {
	errorCount: number;
	// Distinct fingerprints, not raw error events — "how many things
	// broke," not "how many times something broke." Matches how
	// db/issues.ts already defines an issue.
	issueCount: number;
	networkRequestCount: number;
	networkFailureCount: number;
	// 0 when networkRequestCount is 0 — never NaN, so a release with no
	// network telemetry yet renders as "0%," not a broken cell.
	networkFailureRate: number;
	performanceMetrics: PerformanceMetricSummary[];
}
