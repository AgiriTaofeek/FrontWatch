import { afterEach, describe, expect, it } from "bun:test";
import type { ListIssuesResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { issuesQueryOptions } from "./api";
import { IssueList } from "./IssueList";

// IssueList renders <Link>, which needs real router context to render
// (not just a mock) — found by actually running this test, not
// assumed: a bare QueryClientProvider wrapper threw
// "useRouter must be used inside a <RouterProvider>". The target
// route doesn't need to exist in this minimal tree for Link to render
// its href; the root route's own component is where the seeded
// QueryClientProvider gets nested in.
function renderWithIssues(projectId: string, issues: ListIssuesResponse) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(issuesQueryOptions(projectId).queryKey, issues);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<IssueList projectId={projectId} />
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

describe("IssueList", () => {
	it("shows the empty state when there are no issues", async () => {
		renderWithIssues("proj_1", { issues: [] });

		expect(await screen.findByText(/no issues found/i)).toBeTruthy();
	});

	it("renders a row per issue with its key fields", async () => {
		renderWithIssues("proj_1", {
			issues: [
				{
					issueId: "proj_1:fp_1",
					fingerprint: "fp_1",
					title: "Failed to load account",
					exceptionType: "TypeError",
					occurrenceCount: 3,
					firstSeenAt: "2026-08-14 10:00:00.000",
					lastSeenAt: "2026-08-14 11:00:00.000",
					latestRelease: "4.2.0",
					latestRoute: "/transfer",
				},
			],
		});

		expect(await screen.findByText("Failed to load account")).toBeTruthy();
		expect(screen.getByText("TypeError")).toBeTruthy();
		expect(screen.getByText("3")).toBeTruthy();
		expect(screen.getByText("4.2.0")).toBeTruthy();
		expect(screen.getByText("/transfer")).toBeTruthy();
	});

	it("links each issue to its detail page", async () => {
		renderWithIssues("proj_1", {
			issues: [
				{
					issueId: "proj_1:fp_1",
					fingerprint: "fp_1",
					title: "Failed to load account",
					exceptionType: "TypeError",
					occurrenceCount: 1,
					firstSeenAt: "2026-08-14 10:00:00.000",
					lastSeenAt: "2026-08-14 10:00:00.000",
					latestRelease: null,
					latestRoute: null,
				},
			],
		});

		const title = await screen.findByText("Failed to load account");
		const link = title.closest("a");
		expect(link?.getAttribute("href")).toBe("/issues/proj_1%3Afp_1");
	});
});
