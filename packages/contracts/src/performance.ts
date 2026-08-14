// The control-api <-> web contract for the Performance API — same
// reasoning as network.ts: apps/control-api defines these shapes by
// returning them, apps/web consumes the same types instead of a
// separately hand-maintained copy that could drift.

export interface PerformanceMetricSummary {
	metricName: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
	sampleCount: number;
	p50Value: number;
	p75Value: number;
	goodCount: number;
	needsImprovementCount: number;
	poorCount: number;
	// good / sampleCount — same "rate as a derived field, not raw counts
	// the caller has to divide themselves" pattern as
	// NetworkResourceSummary.failureRate.
	goodRate: number;
	lastSeenAt: string;
}

export interface ListPerformanceMetricsResponse {
	metrics: PerformanceMetricSummary[];
}
