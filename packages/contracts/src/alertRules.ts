// The control-api <-> web contract for the Alert Rules API — same
// reasoning as releases.ts: apps/control-api defines these shapes by
// returning them, apps/web consumes the same types instead of a
// separately hand-maintained copy that could drift.
//
// Step 8's full Alerting slice (E13-alerts.md US-13.01/13.02/13.03) —
// all three alert types are real.

export type AlertRuleType =
	| "new_issue"
	| "error_spike"
	| "performance_regression";

// The five Core Web Vitals instrumentation.md names — matches
// packages/sdk/src/performance.ts's own metric set, so a
// performance_regression rule can only ever target a metric that's
// actually collected.
export type AlertMetricName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";

// A flat shape mirroring the actual Postgres row (apps/control-api/src/
// db/schema.ts's alertRules table), not a discriminated union — the
// condition columns are genuinely nullable at the database level (only
// the ones matching `type` are ever populated), so this contract
// reflects that directly rather than presenting a narrower shape the
// wire response wouldn't actually match. Consumers narrow on `type`
// themselves (e.g. AlertRuleDetail.tsx) knowing exactly which
// condition fields will be non-null once they've checked it.
export interface AlertRuleSummary {
	id: string;
	projectId: string;
	type: AlertRuleType;
	webhookUrl: string;
	enabled: boolean;
	windowMinutes: number | null;
	thresholdCount: number | null;
	metricName: AlertMetricName | null;
	thresholdValue: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListAlertRulesResponse {
	alertRules: AlertRuleSummary[];
}
