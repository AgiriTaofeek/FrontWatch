import { afterEach, describe, expect, it } from "bun:test";
import type { IssueDetail as IssueDetailData } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { issueQueryOptions } from "./api";
import { IssueDetail } from "./IssueDetail";

function renderWithIssue(issueId: string, issue: IssueDetailData) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(issueQueryOptions(issueId).queryKey, issue);

	return render(
		<QueryClientProvider client={queryClient}>
			<IssueDetail issueId={issueId} />
		</QueryClientProvider>,
	);
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
});
