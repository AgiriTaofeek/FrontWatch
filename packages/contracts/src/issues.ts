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

export interface OccurrenceSummary {
	eventId: string;
	occurredAt: string;
	release: string | null;
	route: string | null;
	sessionId: string | null;
}

export interface IssueDetail extends IssueSummary {
	recentOccurrences: OccurrenceSummary[];
}

export interface ListIssuesResponse {
	issues: IssueSummary[];
}
