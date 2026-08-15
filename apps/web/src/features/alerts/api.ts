import type {
	AlertMetricName,
	AlertRuleSummary,
	AlertRuleType,
	ListAlertEventsResponse,
	ListAlertRulesResponse,
} from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include
// every relevant filter, same pattern as the other features/*/api.ts
// files.
export function alertRulesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["alert-rules", projectId],
		queryFn: () =>
			apiFetch<ListAlertRulesResponse>(`/projects/${projectId}/alert-rules`),
	});
}

export function alertRuleQueryOptions(ruleId: string) {
	return queryOptions({
		queryKey: ["alert-rule", ruleId],
		queryFn: () => apiFetch<AlertRuleSummary>(`/alert-rules/${ruleId}`),
	});
}

export function alertEventsQueryOptions(ruleId: string) {
	return queryOptions({
		queryKey: ["alert-events", ruleId],
		queryFn: () =>
			apiFetch<ListAlertEventsResponse>(`/alert-rules/${ruleId}/events`),
	});
}

// Mirrors routes/alertRules.ts's discriminated POST body exactly — one
// input shape per alert type, so a form that only fills in the fields
// its selected type actually uses can't accidentally send a
// half-populated body for a different type.
export type CreateAlertRuleInput =
	| { type: "new_issue"; webhookUrl: string }
	| {
			type: "error_spike";
			webhookUrl: string;
			windowMinutes: number;
			thresholdCount: number;
	  }
	| {
			type: "performance_regression";
			webhookUrl: string;
			windowMinutes: number;
			metricName: AlertMetricName;
			thresholdValue: number;
	  };

export const ALERT_RULE_TYPES: AlertRuleType[] = [
	"new_issue",
	"error_spike",
	"performance_regression",
];

export const ALERT_METRIC_NAMES: AlertMetricName[] = [
	"CLS",
	"FCP",
	"INP",
	"LCP",
	"TTFB",
];

// The dashboard's first mutations (every feature before this one was
// read-only display) — plain functions, not useMutation hooks
// themselves, so AlertRuleList can wire them up with whatever
// invalidation/error-handling each call site needs rather than baking
// one opinion in here.
export function createAlertRule(
	projectId: string,
	input: CreateAlertRuleInput,
): Promise<AlertRuleSummary> {
	return apiFetch<AlertRuleSummary>(`/projects/${projectId}/alert-rules`, {
		method: "POST",
		body: input,
	});
}

export function setAlertRuleEnabled(
	projectId: string,
	ruleId: string,
	enabled: boolean,
): Promise<AlertRuleSummary> {
	return apiFetch<AlertRuleSummary>(
		`/projects/${projectId}/alert-rules/${ruleId}`,
		{ method: "PATCH", body: { enabled } },
	);
}

// Shared by AlertRuleList's table and AlertRuleDetail — one place that
// knows how to turn a rule's (possibly-null) condition columns into a
// human-readable summary, rather than duplicating the same per-type
// branching in two components.
export function describeAlertCondition(rule: AlertRuleSummary): string {
	switch (rule.type) {
		case "new_issue":
			return "Any new issue";
		case "error_spike":
			return `≥ ${rule.thresholdCount} errors in ${rule.windowMinutes}m`;
		case "performance_regression":
			return `${rule.metricName} p75 ≥ ${rule.thresholdValue} over ${rule.windowMinutes}m`;
	}
}
