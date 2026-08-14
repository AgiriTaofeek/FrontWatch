import { afterEach, describe, expect, it } from "bun:test";
import type { ListAlertEventsResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { AlertEventList } from "./AlertEventList";
import { alertEventsQueryOptions } from "./api";

// No <Link> here — a plain QueryClientProvider wrapper is enough, same
// as ReleaseHealthView.test.tsx's own reasoning.
function renderWithEvents(ruleId: string, events: ListAlertEventsResponse) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(alertEventsQueryOptions(ruleId).queryKey, events);

	return render(
		<QueryClientProvider client={queryClient}>
			<AlertEventList ruleId={ruleId} />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("AlertEventList", () => {
	it("shows the empty state when nothing has fired yet", async () => {
		renderWithEvents("rule_1", { alertEvents: [] });

		expect(
			await screen.findByText(/no alerts have fired for this rule/i),
		).toBeTruthy();
	});

	it("renders a row per fired event with its key fields", async () => {
		renderWithEvents("rule_1", {
			alertEvents: [
				{
					id: "event_1",
					alertRuleId: "rule_1",
					fingerprint: "fp_abc123",
					state: "triggered",
					triggeredAt: "2026-08-14 10:00:00.000",
					notifiedAt: "2026-08-14 10:00:01.000",
				},
			],
		});

		expect(await screen.findByText("fp_abc123")).toBeTruthy();
		expect(screen.getByText("triggered")).toBeTruthy();
		expect(screen.getByText("2026-08-14 10:00:01.000")).toBeTruthy();
	});

	it("shows a dash when notifiedAt is null — recorded but not delivered", async () => {
		renderWithEvents("rule_1", {
			alertEvents: [
				{
					id: "event_1",
					alertRuleId: "rule_1",
					fingerprint: "fp_abc123",
					state: "triggered",
					triggeredAt: "2026-08-14 10:00:00.000",
					notifiedAt: null,
				},
			],
		});

		await screen.findByText("fp_abc123");
		expect(screen.getByText("—")).toBeTruthy();
	});
});
