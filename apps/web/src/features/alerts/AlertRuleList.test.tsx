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
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { CreateAlertRuleInput } from "./api";
import * as realApi from "./api";

// The dashboard's first mutation component test. Only createAlertRule/
// setAlertRuleEnabled are mocked (controllable per test, without a
// real control-api running) — alertRulesQueryOptions stays the real
// one, spread in from the real module, so queryClient.setQueryData
// against its actual query key still works exactly like every other
// feature's read-only tests already do.
const createAlertRuleMock = mock(
	(_projectId: string, _input: CreateAlertRuleInput) =>
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

function newIssueRule(
	overrides: Partial<AlertRuleSummary> = {},
): AlertRuleSummary {
	return {
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
		...overrides,
	};
}

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

	it("renders a row per rule with its key fields, including its condition summary", async () => {
		renderWithRules("proj_1", { alertRules: [newIssueRule()] });

		expect(await screen.findByText("https://example.com/hooks/1")).toBeTruthy();

		// Scoped to the table — the type selector's <option> also renders
		// the literal text "new_issue", so an unscoped getByText would
		// match twice.
		const table = screen.getByRole("table");
		expect(within(table).getByText("new_issue")).toBeTruthy();
		expect(within(table).getByText("Any new issue")).toBeTruthy();
		expect(within(table).getByText("Enabled")).toBeTruthy();
	});

	it("shows an error_spike rule's threshold/window condition", async () => {
		renderWithRules("proj_1", {
			alertRules: [
				newIssueRule({
					id: "rule_2",
					type: "error_spike",
					windowMinutes: 10,
					thresholdCount: 25,
				}),
			],
		});

		expect(await screen.findByText("≥ 25 errors in 10m")).toBeTruthy();
	});

	it("shows a performance_regression rule's metric/threshold/window condition", async () => {
		renderWithRules("proj_1", {
			alertRules: [
				newIssueRule({
					id: "rule_3",
					type: "performance_regression",
					windowMinutes: 15,
					metricName: "LCP",
					thresholdValue: 2500,
				}),
			],
		});

		expect(await screen.findByText("LCP p75 ≥ 2500 over 15m")).toBeTruthy();
	});

	it("links each rule to its detail page", async () => {
		renderWithRules("proj_1", { alertRules: [newIssueRule()] });

		const link = await screen.findByText("https://example.com/hooks/1");
		expect(link.closest("a")?.getAttribute("href")).toBe("/alert-rules/rule_1");
	});

	it("submits a new_issue rule from the create form (default type)", async () => {
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
			expect(createAlertRuleMock).toHaveBeenCalledWith("proj_1", {
				type: "new_issue",
				webhookUrl: "https://example.com/hooks/new",
			});
		});
	});

	it("submits an error_spike rule with its threshold/window fields", async () => {
		global.fetch = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ alertRules: [] }))),
		) as unknown as typeof fetch;

		renderWithRules("proj_1", { alertRules: [] });

		fireEvent.change(await screen.findByLabelText(/alert type/i), {
			target: { value: "error_spike" },
		});
		fireEvent.change(screen.getByLabelText(/webhook url/i), {
			target: { value: "https://example.com/hooks/spike" },
		});
		fireEvent.change(screen.getByLabelText(/window \(minutes\)/i), {
			target: { value: "5" },
		});
		fireEvent.change(screen.getByLabelText(/error count threshold/i), {
			target: { value: "50" },
		});
		fireEvent.click(screen.getByRole("button", { name: /create alert rule/i }));

		await waitFor(() => {
			expect(createAlertRuleMock).toHaveBeenCalledWith("proj_1", {
				type: "error_spike",
				webhookUrl: "https://example.com/hooks/spike",
				windowMinutes: 5,
				thresholdCount: 50,
			});
		});
	});

	it("submits a performance_regression rule with its metric/threshold/window fields", async () => {
		global.fetch = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ alertRules: [] }))),
		) as unknown as typeof fetch;

		renderWithRules("proj_1", { alertRules: [] });

		fireEvent.change(await screen.findByLabelText(/alert type/i), {
			target: { value: "performance_regression" },
		});
		fireEvent.change(screen.getByLabelText(/webhook url/i), {
			target: { value: "https://example.com/hooks/regression" },
		});
		fireEvent.change(screen.getByLabelText(/window \(minutes\)/i), {
			target: { value: "15" },
		});
		// Exact match — an /metric/i regex would also match the threshold
		// field's label ("p75 threshold (metric's native unit...)").
		fireEvent.change(screen.getByLabelText("Metric"), {
			target: { value: "CLS" },
		});
		fireEvent.change(screen.getByLabelText(/p75 threshold/i), {
			target: { value: "0.25" },
		});
		fireEvent.click(screen.getByRole("button", { name: /create alert rule/i }));

		await waitFor(() => {
			expect(createAlertRuleMock).toHaveBeenCalledWith("proj_1", {
				type: "performance_regression",
				webhookUrl: "https://example.com/hooks/regression",
				windowMinutes: 15,
				metricName: "CLS",
				thresholdValue: 0.25,
			});
		});
	});

	it("toggles a rule's enabled state via the action button", async () => {
		global.fetch = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ alertRules: [] }))),
		) as unknown as typeof fetch;

		renderWithRules("proj_1", { alertRules: [newIssueRule()] });

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
