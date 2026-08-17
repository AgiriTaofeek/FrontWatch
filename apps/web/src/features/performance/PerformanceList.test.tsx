import { afterEach, describe, expect, it } from "bun:test";
import type { ListPerformanceMetricsResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { DEFAULT_FILTER_BAR_VALUE } from "../../components/FilterBar";
import { performanceMetricsQueryOptions } from "./api";
import { PerformanceList } from "./PerformanceList";

// Same RouterProvider-context reasoning as NetworkList.test.tsx — this
// component doesn't itself render a <Link>, but wrapping it the same
// way keeps the test setup consistent across features/.
function renderWithMetrics(
	projectId: string,
	metrics: ListPerformanceMetricsResponse,
) {
	const queryClient = new QueryClient();
	// Must match PerformanceList's own default filter state — see
	// NetworkList.test.tsx's identical comment for why.
	queryClient.setQueryData(
		performanceMetricsQueryOptions(projectId, DEFAULT_FILTER_BAR_VALUE)
			.queryKey,
		metrics,
	);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<PerformanceList projectId={projectId} />
			</QueryClientProvider>
		),
	});

	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	return render(<RouterProvider router={router} />);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("PerformanceList", () => {
	it("shows the empty state when there are no performance metrics", async () => {
		renderWithMetrics("proj_1", { metrics: [] });

		expect(
			await screen.findByText(/no performance metrics recorded/i),
		).toBeTruthy();
	});

	it("renders a row per metric, formatting a duration metric in ms", async () => {
		renderWithMetrics("proj_1", {
			metrics: [
				{
					metricName: "LCP",
					sampleCount: 10,
					p50Value: 1800.4,
					p75Value: 2400.9,
					goodCount: 7,
					needsImprovementCount: 2,
					poorCount: 1,
					goodRate: 0.7,
					lastSeenAt: "2026-08-14 11:00:00.000",
				},
			],
		});

		expect(await screen.findByText("LCP")).toBeTruthy();
		expect(screen.getByText("10")).toBeTruthy();
		expect(screen.getByText("1800ms")).toBeTruthy();
		expect(screen.getByText("2401ms")).toBeTruthy();
		expect(screen.getByText("70.0%")).toBeTruthy();
	});

	it("formats CLS as a unitless score, not a duration", async () => {
		renderWithMetrics("proj_1", {
			metrics: [
				{
					metricName: "CLS",
					sampleCount: 5,
					p50Value: 0.05,
					p75Value: 0.12,
					goodCount: 5,
					needsImprovementCount: 0,
					poorCount: 0,
					goodRate: 1,
					lastSeenAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		expect(await screen.findByText("CLS")).toBeTruthy();
		expect(screen.getByText("0.050")).toBeTruthy();
		expect(screen.getByText("0.120")).toBeTruthy();
		// Never "0.050ms" — CLS has no unit at all.
		expect(screen.queryByText(/0\.050ms/)).toBeNull();
	});

	it("keeps different metrics as separate rows", async () => {
		renderWithMetrics("proj_1", {
			metrics: [
				{
					metricName: "CLS",
					sampleCount: 1,
					p50Value: 0.01,
					p75Value: 0.01,
					goodCount: 1,
					needsImprovementCount: 0,
					poorCount: 0,
					goodRate: 1,
					lastSeenAt: "2026-08-14 09:00:00.000",
				},
				{
					metricName: "LCP",
					sampleCount: 1,
					p50Value: 1000,
					p75Value: 1000,
					goodCount: 1,
					needsImprovementCount: 0,
					poorCount: 0,
					goodRate: 1,
					lastSeenAt: "2026-08-14 09:00:00.000",
				},
			],
		});

		expect(await screen.findByText("CLS")).toBeTruthy();
		expect(screen.getByText("LCP")).toBeTruthy();
	});
});
