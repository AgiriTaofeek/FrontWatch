import { afterEach, describe, expect, it } from "bun:test";
import type {
	AlertRuleSummary,
	ListAlertEventsResponse,
} from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { AlertRuleDetail } from "./AlertRuleDetail";
import { alertEventsQueryOptions, alertRuleQueryOptions } from "./api";

function renderWithData(
	ruleId: string,
	rule: AlertRuleSummary,
	events: ListAlertEventsResponse,
) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(alertRuleQueryOptions(ruleId).queryKey, rule);
	queryClient.setQueryData(alertEventsQueryOptions(ruleId).queryKey, events);

	return render(
		<QueryClientProvider client={queryClient}>
			<AlertRuleDetail ruleId={ruleId} />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("AlertRuleDetail", () => {
	it("renders the rule's metadata (including its condition) and its (empty) fired-events list", async () => {
		renderWithData(
			"rule_1",
			{
				id: "rule_1",
				projectId: "proj_1",
				type: "new_issue",
				webhookUrl: "https://example.com/hooks/1",
				enabled: true,
				windowMinutes: null,
				thresholdCount: null,
				metricName: null,
				thresholdValue: null,
				createdAt: "2026-08-14 10:00:00.000",
				updatedAt: "2026-08-14 10:00:00.000",
			},
			{ alertEvents: [] },
		);

		expect(
			await screen.findByRole("heading", {
				name: "https://example.com/hooks/1",
			}),
		).toBeTruthy();
		expect(screen.getByText("Any new issue")).toBeTruthy();
		expect(screen.getByText("Enabled")).toBeTruthy();
		expect(screen.getByText(/no alerts have fired/i)).toBeTruthy();
	});

	it("renders an error_spike rule's condition alongside fired events", async () => {
		renderWithData(
			"rule_1",
			{
				id: "rule_1",
				projectId: "proj_1",
				type: "error_spike",
				webhookUrl: "https://example.com/hooks/1",
				enabled: false,
				windowMinutes: 10,
				thresholdCount: 25,
				metricName: null,
				thresholdValue: null,
				createdAt: "2026-08-14 10:00:00.000",
				updatedAt: "2026-08-14 10:00:00.000",
			},
			{
				alertEvents: [
					{
						id: "event_1",
						alertRuleId: "rule_1",
						fingerprint: "fp_abc123",
						state: "triggered",
						triggeredAt: "2026-08-14 11:00:00.000",
						notifiedAt: "2026-08-14 11:00:01.000",
					},
				],
			},
		);

		expect(await screen.findByText("Disabled")).toBeTruthy();
		expect(screen.getByText("≥ 25 errors in 10m")).toBeTruthy();
		expect(screen.getByText("fp_abc123")).toBeTruthy();
	});
});
