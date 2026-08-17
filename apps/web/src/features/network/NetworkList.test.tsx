import { afterEach, describe, expect, it } from "bun:test";
import type { ListNetworkResourcesResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { DEFAULT_FILTER_BAR_VALUE } from "../../components/FilterBar";
import { networkResourcesQueryOptions } from "./api";
import { NetworkList } from "./NetworkList";

// Same RouterProvider-context reasoning as IssueList.test.tsx — this
// component doesn't itself render a <Link>, but wrapping it the same
// way keeps the test setup consistent across features/ and cheap to
// extend later if a per-resource detail link gets added.
function renderWithResources(
	projectId: string,
	resources: ListNetworkResourcesResponse,
) {
	const queryClient = new QueryClient();
	// Must match NetworkList's own default filter state exactly — the
	// query key includes filters now, so seeding the cache under a
	// different key would leave the component's real query un-seeded
	// and it would suspend on a real (unmocked) fetch instead.
	queryClient.setQueryData(
		networkResourcesQueryOptions(projectId, DEFAULT_FILTER_BAR_VALUE).queryKey,
		resources,
	);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<NetworkList projectId={projectId} />
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

describe("NetworkList", () => {
	it("shows the empty state when there are no network resources", async () => {
		renderWithResources("proj_1", { resources: [] });

		expect(
			await screen.findByText(/no network requests recorded/i),
		).toBeTruthy();
	});

	it("renders a row per resource with its key fields", async () => {
		renderWithResources("proj_1", {
			resources: [
				{
					method: "GET",
					resource: "/api/users/:id",
					requestCount: 4,
					failureCount: 1,
					failureRate: 0.25,
					p50DurationMs: 87.5,
					p95DurationMs: 210.2,
					lastSeenAt: "2026-08-14 11:00:00.000",
				},
			],
		});

		expect(await screen.findByText("GET")).toBeTruthy();
		expect(screen.getByText("/api/users/:id")).toBeTruthy();
		expect(screen.getByText("4")).toBeTruthy();
		expect(screen.getByText("25.0%")).toBeTruthy();
		expect(screen.getByText("88ms")).toBeTruthy();
		expect(screen.getByText("210ms")).toBeTruthy();
	});

	it("keeps different methods to the same resource as separate rows", async () => {
		renderWithResources("proj_1", {
			resources: [
				{
					method: "GET",
					resource: "/api/orders/:id",
					requestCount: 2,
					failureCount: 0,
					failureRate: 0,
					p50DurationMs: 30,
					p95DurationMs: 40,
					lastSeenAt: "2026-08-14 10:00:00.000",
				},
				{
					method: "POST",
					resource: "/api/orders/:id",
					requestCount: 1,
					failureCount: 0,
					failureRate: 0,
					p50DurationMs: 50,
					p95DurationMs: 50,
					lastSeenAt: "2026-08-14 09:00:00.000",
				},
			],
		});

		expect(await screen.findByText("GET")).toBeTruthy();
		expect(screen.getByText("POST")).toBeTruthy();
		expect(screen.getAllByText("/api/orders/:id")).toHaveLength(2);
	});
});
