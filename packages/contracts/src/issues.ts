// The control-api <-> web contract for the Issue API. Shared for the
// same reason telemetry.ts is shared between the SDK and ingestion
// (Step 4's actual lesson, not just convention): apps/control-api
// defines these shapes by returning them, apps/web consumes the same
// types instead of a separately hand-maintained copy that could drift.

export interface IssueSummary {
	issueId: string;
	fingerprint: string;
	title: string;
	exceptionType: string;
	occurrenceCount: number;
	firstSeenAt: string;
	lastSeenAt: string;
	latestRelease: string | null;
	latestRoute: string | null;
}

// Mirrors packages/sdk's Breadcrumb/BreadcrumbCategory — a separate
// definition rather than a shared import, since packages/contracts
// isn't an sdk dependency and shouldn't become one just for a type this
// small. Kept namespaced (Occurrence-prefixed) so it can't be confused
// with a future control-api-side breadcrumb concept if one ever exists.
export type OccurrenceBreadcrumbCategory =
	| "navigation"
	| "interaction"
	| "network"
	| "error"
	| "performance"
	| "custom";

export interface OccurrenceBreadcrumb {
	category: OccurrenceBreadcrumbCategory;
	message: string;
	timestamp: string;
	data?: Record<string, unknown>;
}

export interface OccurrenceSummary {
	eventId: string;
	occurredAt: string;
	release: string | null;
	route: string | null;
	sessionId: string | null;
	// The trail attached to this occurrence's error payload, oldest
	// first — empty when the SDK version that captured it predates
	// breadcrumbs, or genuinely had nothing to record yet.
	breadcrumbs: OccurrenceBreadcrumb[];
}

export interface IssueDetail extends IssueSummary {
	recentOccurrences: OccurrenceSummary[];
}

export interface ListIssuesResponse {
	issues: IssueSummary[];
}
