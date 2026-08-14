import { afterEach, describe, expect, it } from "bun:test";
import type { IssueDetail as IssueDetailData } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { issueQueryOptions } from "./api";
import { IssueDetail } from "./IssueDetail";

// Now renders a <Link> to the occurrence's session (Step 7), which
// needs real router context — same reasoning as IssueList.test.tsx's
// own comment: a bare QueryClientProvider wrapper throws "useRouter
// must be used inside a <RouterProvider>".
function renderWithIssue(issueId: string, issue: IssueDetailData) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(issueQueryOptions(issueId).queryKey, issue);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<IssueDetail issueId={issueId} />
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

describe("IssueDetail", () => {
	it("renders title, exception type, and summary fields", async () => {
		renderWithIssue("proj_1:fp_1", {
			issueId: "proj_1:fp_1",
			fingerprint: "fp_1",
			title: "Failed to load account",
			exceptionType: "TypeError",
			occurrenceCount: 5,
			firstSeenAt: "2026-08-14 09:00:00.000",
			lastSeenAt: "2026-08-14 11:00:00.000",
			latestRelease: "4.2.0",
			latestRoute: "/transfer",
			recentOccurrences: [],
		});

		expect(
			await screen.findByRole("heading", { name: "Failed to load account" }),
		).toBeTruthy();
		expect(screen.getByText("TypeError")).toBeTruthy();
		expect(screen.getByText("5")).toBeTruthy();
	});

	it("shows a no-occurrences message when there are none", async () => {
		renderWithIssue("proj_1:fp_1", {
			issueId: "proj_1:fp_1",
			fingerprint: "fp_1",
			title: "x",
			exceptionType: "Error",
			occurrenceCount: 0,
			firstSeenAt: "2026-08-14 09:00:00.000",
			lastSeenAt: "2026-08-14 09:00:00.000",
			latestRelease: null,
			latestRoute: null,
			recentOccurrences: [],
		});

		expect(await screen.findByText(/no occurrences recorded/i)).toBeTruthy();
	});

	it("renders a row per recent occurrence", async () => {
		renderWithIssue("proj_1:fp_1", {
			issueId: "proj_1:fp_1",
			fingerprint: "fp_1",
			title: "x",
			exceptionType: "Error",
			occurrenceCount: 1,
			firstSeenAt: "2026-08-14 08:00:00.000",
			lastSeenAt: "2026-08-14 09:00:00.000",
			latestRelease: null,
			latestRoute: null,
			recentOccurrences: [
				{
					eventId: "evt_1",
					occurredAt: "2026-08-14 09:30:00.000",
					release: "4.2.0",
					route: "/transfer",
					sessionId: null,
				},
			],
		});

		// event id isn't rendered directly in the table, only its fields —
		// queryByText (not findByText, which throws when absent) confirms
		// this without waiting on something that will never appear.
		await screen.findByText("2026-08-14 09:30:00.000");
		expect(screen.queryByText("evt_1")).toBeNull();
	});

	it("shows a dash for an occurrence with no session", async () => {
		renderWithIssue("proj_1:fp_1", {
			issueId: "proj_1:fp_1",
			fingerprint: "fp_1",
			title: "x",
			exceptionType: "Error",
			occurrenceCount: 1,
			firstSeenAt: "2026-08-14 08:00:00.000",
			lastSeenAt: "2026-08-14 09:00:00.000",
			latestRelease: null,
			latestRoute: null,
			recentOccurrences: [
				{
					eventId: "evt_1",
					occurredAt: "2026-08-14 09:30:00.000",
					release: null,
					route: null,
					sessionId: null,
				},
			],
		});

		await screen.findByText("2026-08-14 09:30:00.000");
		expect(screen.queryByText("View session")).toBeNull();
	});

	it("links an occurrence with a session to its session detail page, scoped to the issue's project", async () => {
		renderWithIssue("proj_1:fp_1", {
			issueId: "proj_1:fp_1",
			fingerprint: "fp_1",
			title: "x",
			exceptionType: "Error",
			occurrenceCount: 1,
			firstSeenAt: "2026-08-14 08:00:00.000",
			lastSeenAt: "2026-08-14 09:00:00.000",
			latestRelease: null,
			latestRoute: null,
			recentOccurrences: [
				{
					eventId: "evt_1",
					occurredAt: "2026-08-14 09:30:00.000",
					release: null,
					route: null,
					sessionId: "sess_abc",
				},
			],
		});

		const link = await screen.findByText("View session");
		// "proj_1" (the issue's own project, parsed from issueId) +
		// "sess_abc" (the occurrence's raw session id) — not the whole
		// issueId, which would incorrectly append the fingerprint too.
		expect(link.getAttribute("href")).toBe("/sessions/proj_1%3Asess_abc");
	});
});
