// The control-api <-> web contract for the Release API — same
// reasoning as issues.ts/network.ts: apps/control-api defines these
// shapes by returning them, apps/web consumes the same types instead
// of a separately hand-maintained copy that could drift.
//
// Unlike issues/network/sessions/performance, this isn't a ClickHouse
// aggregation view — `releases` is a real Postgres table (Step 7's
// Release sub-item), so this shape mirrors a row, not a GROUP BY
// result. Release-health aggregation (joining this against ClickHouse
// events where `release = version`) is separate, deferred follow-up
// work — this piece is just "does a deployment record exist."

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
