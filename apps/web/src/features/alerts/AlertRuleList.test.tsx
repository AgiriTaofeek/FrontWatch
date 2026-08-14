import { afterEach, describe, expect, it, mock } from "bun:test";
import type {
	AlertRuleSummary,
	ListAlertRulesResponse,
} from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as realApi from "./api";

// The dashboard's first mutation component test. Only createAlertRule/
// setAlertRuleEnabled are mocked (controllable per test, without a
// real control-api running) — alertRulesQueryOptions stays the real
// one, spread in from the real module, so queryClient.setQueryData
// against its actual query key still works exactly like every other
// feature's read-only tests already do.
const createAlertRuleMock = mock((_projectId: string, _webhookUrl: string) =>
	Promise.resolve({} as AlertRuleSummary),
);
const setAlertRuleEnabledMock = mock(
	(_projectId: string, _ruleId: string, _enabled: boolean) =>
		Promise.resolve({} as AlertRuleSummary),
);

mock.module("./api", () => ({
	...realApi,
	createAlertRule: createAlertRuleMock,
	setAlertRuleEnabled: setAlertRuleEnabledMock,
}));

const { AlertRuleList } = await import("./AlertRuleList");
const { alertRulesQueryOptions } = await import("./api");

function renderWithRules(projectId: string, rules: ListAlertRulesResponse) {
	// retry:false — a mutation's onSuccess invalidates this query, which
	// makes TanStack Query refetch it via the *real* apiFetch/fetch
	// (alertRulesQueryOptions itself isn't mocked, only the mutation
	// functions are). The stubbed fetch below answers that refetch
	// harmlessly instead of hitting the real network with nothing
	// listening.
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	queryClient.setQueryData(alertRulesQueryOptions(projectId).queryKey, rules);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<AlertRuleList projectId={projectId} />
			</QueryClientProvider>
		),
	});

	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	return render(<RouterProvider router={router} />);
}

const originalFetch = global.fetch;

afterEach(() => {
	document.body.innerHTML = "";
	createAlertRuleMock.mockClear();
	setAlertRuleEnabledMock.mockClear();
	global.fetch = originalFetch;
});

describe("AlertRuleList", () => {
	it("shows the empty state when there are no rules", async () => {
		renderWithRules("proj_1", { alertRules: [] });

		expect(await screen.findByText(/no alert rules configured/i)).toBeTruthy();
	});

	it("renders a row per rule with its key fields", async () => {
		renderWithRules("proj_1", {
			alertRules: [
				{
					id: "rule_1",
					projectId: "proj_1",
					type: "new_issue",
					webhookUrl: "https://example.com/hooks/1",
					enabled: true,
					createdAt: "2026-08-14 10:00:00.000",
					updatedAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		expect(await screen.findByText("https://example.com/hooks/1")).toBeTruthy();
		expect(screen.getByText("new_issue")).toBeTruthy();
		expect(screen.getByText("Enabled")).toBeTruthy();
	});

	it("links each rule to its detail page", async () => {
		renderWithRules("proj_1", {
			alertRules: [
				{
					id: "rule_1",
					projectId: "proj_1",
					type: "new_issue",
					webhookUrl: "https://example.com/hooks/1",
					enabled: true,
					createdAt: "2026-08-14 10:00:00.000",
					updatedAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		const link = await screen.findByText("https://example.com/hooks/1");
		expect(link.closest("a")?.getAttribute("href")).toBe("/alert-rules/rule_1");
	});

	it("submits the webhook URL from the create form", async () => {
		global.fetch = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ alertRules: [] }))),
		) as unknown as typeof fetch;

		renderWithRules("proj_1", { alertRules: [] });

		const input = (await screen.findByLabelText(
			/webhook url/i,
		)) as HTMLInputElement;
		fireEvent.change(input, {
			target: { value: "https://example.com/hooks/new" },
		});
		fireEvent.click(screen.getByRole("button", { name: /create alert rule/i }));

		await waitFor(() => {
			expect(createAlertRuleMock).toHaveBeenCalledWith(
				"proj_1",
				"https://example.com/hooks/new",
			);
		});
	});

	it("toggles a rule's enabled state via the action button", async () => {
		global.fetch = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ alertRules: [] }))),
		) as unknown as typeof fetch;

		renderWithRules("proj_1", {
			alertRules: [
				{
					id: "rule_1",
					projectId: "proj_1",
					type: "new_issue",
					webhookUrl: "https://example.com/hooks/1",
					enabled: true,
					createdAt: "2026-08-14 10:00:00.000",
					updatedAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		fireEvent.click(await screen.findByRole("button", { name: /disable/i }));

		await waitFor(() => {
			expect(setAlertRuleEnabledMock).toHaveBeenCalledWith(
				"proj_1",
				"rule_1",
				false,
			);
		});
	});
});
