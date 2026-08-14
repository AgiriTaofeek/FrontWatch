import { afterEach, describe, expect, it } from "bun:test";
import type { ListSessionsResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { sessionsQueryOptions } from "./api";
import { SessionList } from "./SessionList";

// Same RouterProvider-context reasoning as IssueList.test.tsx —
// SessionList renders a <Link> per row.
function renderWithSessions(projectId: string, sessions: ListSessionsResponse) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(sessionsQueryOptions(projectId).queryKey, sessions);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<SessionList projectId={projectId} />
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

describe("SessionList", () => {
	it("shows the empty state when there are no sessions", async () => {
		renderWithSessions("proj_1", { sessions: [] });

		expect(await screen.findByText(/no sessions recorded/i)).toBeTruthy();
	});

	it("renders a row per session with its key fields", async () => {
		renderWithSessions("proj_1", {
			sessions: [
				{
					sessionId: "proj_1:sess_1",
					startedAt: "2026-08-14 10:00:00.000",
					lastSeenAt: "2026-08-14 10:05:00.000",
					eventCount: 3,
					errorCount: 1,
					networkCount: 2,
					firstRoute: "/checkout",
					lastRoute: "/checkout/confirm",
				},
			],
		});

		expect(await screen.findByText("proj_1:sess_1")).toBeTruthy();
		expect(screen.getByText("3")).toBeTruthy();
		expect(screen.getByText("/checkout")).toBeTruthy();
		expect(screen.getByText("/checkout/confirm")).toBeTruthy();
	});

	it("links each session to its detail page", async () => {
		renderWithSessions("proj_1", {
			sessions: [
				{
					sessionId: "proj_1:sess_1",
					startedAt: "2026-08-14 10:00:00.000",
					lastSeenAt: "2026-08-14 10:00:00.000",
					eventCount: 1,
					errorCount: 0,
					networkCount: 1,
					firstRoute: null,
					lastRoute: null,
				},
			],
		});

		const link = await screen.findByText("proj_1:sess_1");
		expect(link.closest("a")?.getAttribute("href")).toBe(
			"/sessions/proj_1%3Asess_1",
		);
	});
});
