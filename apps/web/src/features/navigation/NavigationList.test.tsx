import { afterEach, describe, expect, it } from "bun:test";
import type { ListNavigationTransitionsResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { navigationTransitionsQueryOptions } from "./api";
import { NavigationList } from "./NavigationList";

// Same RouterProvider-context reasoning as NetworkList.test.tsx.
function renderWithTransitions(
	projectId: string,
	transitions: ListNavigationTransitionsResponse,
) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(
		navigationTransitionsQueryOptions(projectId).queryKey,
		transitions,
	);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<NavigationList projectId={projectId} />
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

describe("NavigationList", () => {
	it("shows the empty state when there are no navigation transitions", async () => {
		renderWithTransitions("proj_1", { transitions: [] });

		expect(
			await screen.findByText(/no navigation events recorded/i),
		).toBeTruthy();
	});

	it("renders a row per transition with its key fields", async () => {
		renderWithTransitions("proj_1", {
			transitions: [
				{
					fromRoute: "/accounts",
					toRoute: "/settings",
					transitionCount: 12,
					lastSeenAt: "2026-08-16 09:00:00.000",
				},
			],
		});

		expect(await screen.findByText("/accounts")).toBeTruthy();
		expect(screen.getByText("/settings")).toBeTruthy();
		expect(screen.getByText("12")).toBeTruthy();
	});

	it("shows a placeholder for a null fromRoute (the very first navigation)", async () => {
		renderWithTransitions("proj_1", {
			transitions: [
				{
					fromRoute: null,
					toRoute: "/landing",
					transitionCount: 3,
					lastSeenAt: "2026-08-16 09:00:00.000",
				},
			],
		});

		expect(await screen.findByText("(first navigation)")).toBeTruthy();
		expect(screen.getByText("/landing")).toBeTruthy();
	});

	it("keeps different from_route values to the same to_route as separate rows", async () => {
		renderWithTransitions("proj_1", {
			transitions: [
				{
					fromRoute: "/accounts",
					toRoute: "/settings",
					transitionCount: 5,
					lastSeenAt: "2026-08-16 09:00:00.000",
				},
				{
					fromRoute: "/dashboard",
					toRoute: "/settings",
					transitionCount: 2,
					lastSeenAt: "2026-08-16 08:00:00.000",
				},
			],
		});

		expect(await screen.findByText("/accounts")).toBeTruthy();
		expect(screen.getByText("/dashboard")).toBeTruthy();
		expect(screen.getAllByText("/settings")).toHaveLength(2);
	});
});
