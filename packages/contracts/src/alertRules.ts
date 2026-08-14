// The control-api <-> web contract for the Alert Rules API — same
// reasoning as releases.ts: apps/control-api defines these shapes by
// returning them, apps/web consumes the same types instead of a
// separately hand-maintained copy that could drift.
//
// Step 8's first Alerting slice (E13-alerts.md) — only "new_issue"
// exists yet, error_spike/performance_regression are deferred to
// later chunks with their own condition shapes, not forgotten.

export type AlertRuleType = "new_issue";

export interface AlertRuleSummary {
	id: string;
	projectId: string;
	type: AlertRuleType;
	webhookUrl: string;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ListAlertRulesResponse {
	alertRules: AlertRuleSummary[];
}
