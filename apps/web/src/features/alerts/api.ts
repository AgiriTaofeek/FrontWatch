import type {
	AlertRuleSummary,
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

// The dashboard's first mutations (every feature before this one was
// read-only display) — plain functions, not useMutation hooks
// themselves, so AlertRuleList can wire them up with whatever
// invalidation/error-handling each call site needs rather than baking
// one opinion in here.
export function createAlertRule(
	projectId: string,
	webhookUrl: string,
): Promise<AlertRuleSummary> {
	return apiFetch<AlertRuleSummary>(`/projects/${projectId}/alert-rules`, {
		method: "POST",
		body: { webhookUrl },
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
