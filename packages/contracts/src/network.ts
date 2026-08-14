// The control-api <-> web contract for the Network resources API — same
// reasoning as issues.ts: apps/control-api defines these shapes by
// returning them, apps/web consumes the same types instead of a
// separately hand-maintained copy that could drift.

export interface NetworkResourceSummary {
	method: string;
	resource: string;
	requestCount: number;
	failureCount: number;
	failureRate: number;
	p50DurationMs: number;
	p95DurationMs: number;
	lastSeenAt: string;
}

export interface ListNetworkResourcesResponse {
	resources: NetworkResourceSummary[];
}
