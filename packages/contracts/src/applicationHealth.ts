import type { PerformanceMetricSummary } from "./performance";

// health-monitoring.md's own "critical distinction the system must
// never blur": Healthy vs. No telemetry vs. Telemetry stale are three
// different states — a lack of data must never silently render as
// "healthy." This is why every telemetry-derived field below is
// nullable and gated by telemetryStatus, not defaulted to zero.
export type TelemetryStatus = "healthy" | "no_telemetry" | "stale";

export interface ApplicationHealthErrors {
	count: number;
	// Same window size, immediately prior — health-monitoring.md's first
	// screen explicitly wants an "error trend," not just a point-in-time
	// count.
	previousWindowCount: number;
	// Distinct fingerprints active in the window, not first-seen-in-window
	// (that's listNewIssues' job, a different question) — "how many
	// things are currently broken," matching getReleaseHealth's own
	// issueCount semantics.
	issueCount: number;
}

export interface ApplicationHealthNetwork {
	requestCount: number;
	failureCount: number;
	failureRate: number;
}

export interface ApplicationHealthLatestRelease {
	version: string;
	deployedAt: string;
}

export interface ApplicationHealth {
	telemetryStatus: TelemetryStatus;
	windowMinutes: number;
	lastEventAt: string | null;
	// All three null together when telemetryStatus is "no_telemetry" —
	// there is no meaningful "0 errors" to report when nothing has ever
	// been observed, only "we don't know yet."
	errors: ApplicationHealthErrors | null;
	network: ApplicationHealthNetwork | null;
	performanceMetrics: PerformanceMetricSummary[] | null;
	// Independent of telemetryStatus — a release can be registered before
	// any telemetry ever arrives tagged with it (Step 7's own release
	// creation flow doesn't require telemetry to exist first).
	latestRelease: ApplicationHealthLatestRelease | null;
}
