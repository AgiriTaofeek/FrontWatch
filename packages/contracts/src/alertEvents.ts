// The control-api <-> web contract for the Alert Events API — the
// fired-notification history behind an alert_rules row (Step 8).
// Separate file from alertRules.ts: rules are configuration, events
// are a log of what actually happened, same "issues vs occurrences"
// split issues.ts already draws between an issue and its occurrences.

export type AlertEventState =
	| "triggered"
	| "acknowledged"
	| "recovered"
	| "resolved";

export interface AlertEventSummary {
	id: string;
	alertRuleId: string;
	fingerprint: string;
	state: AlertEventState;
	triggeredAt: string;
	notifiedAt: string | null;
}

export interface ListAlertEventsResponse {
	alertEvents: AlertEventSummary[];
}
