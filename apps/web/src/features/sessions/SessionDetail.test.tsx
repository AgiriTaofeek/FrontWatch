import { afterEach, describe, expect, it } from "bun:test";
import type { SessionDetail as SessionDetailData } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { sessionQueryOptions } from "./api";
import { SessionDetail } from "./SessionDetail";

// No <Link> rendered here (unlike SessionList/IssueDetail) — a plain
// QueryClientProvider wrapper is enough, no router context needed.
function renderWithSession(sessionId: string, session: SessionDetailData) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(sessionQueryOptions(sessionId).queryKey, session);

	return render(
		<QueryClientProvider client={queryClient}>
			<SessionDetail sessionId={sessionId} />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("SessionDetail", () => {
	it("renders summary fields", async () => {
		renderWithSession("proj_1:sess_1", {
			sessionId: "proj_1:sess_1",
			startedAt: "2026-08-14 10:00:00.000",
			lastSeenAt: "2026-08-14 10:05:00.000",
			eventCount: 2,
			errorCount: 1,
			networkCount: 1,
			firstRoute: "/checkout",
			lastRoute: "/checkout/confirm",
			timeline: [],
		});

		expect(
			await screen.findByRole("heading", { name: "proj_1:sess_1" }),
		).toBeTruthy();
		expect(screen.getByText("2026-08-14 10:00:00.000")).toBeTruthy();
		expect(screen.getByText("/checkout")).toBeTruthy();
		expect(screen.getByText("/checkout/confirm")).toBeTruthy();
	});

	it("shows a no-events message when the timeline is empty", async () => {
		renderWithSession("proj_1:sess_1", {
			sessionId: "proj_1:sess_1",
			startedAt: "2026-08-14 10:00:00.000",
			lastSeenAt: "2026-08-14 10:00:00.000",
			eventCount: 0,
			errorCount: 0,
			networkCount: 0,
			firstRoute: null,
			lastRoute: null,
			timeline: [],
		});

		expect(await screen.findByText(/no events recorded/i)).toBeTruthy();
	});

	it("renders a row per timeline event in order", async () => {
		renderWithSession("proj_1:sess_1", {
			sessionId: "proj_1:sess_1",
			startedAt: "2026-08-14 10:00:00.000",
			lastSeenAt: "2026-08-14 10:05:00.000",
			eventCount: 2,
			errorCount: 1,
			networkCount: 1,
			firstRoute: "/checkout",
			lastRoute: "/checkout/confirm",
			timeline: [
				{
					eventId: "evt_1",
					eventType: "error",
					occurredAt: "2026-08-14 10:00:00.000",
					route: "/checkout",
					summary: "Card declined",
				},
				{
					eventId: "evt_2",
					eventType: "network",
					occurredAt: "2026-08-14 10:05:00.000",
					route: "/checkout/confirm",
					summary: "POST /api/pay -> 200",
				},
			],
		});

		expect(await screen.findByText("Card declined")).toBeTruthy();
		expect(screen.getByText("POST /api/pay -> 200")).toBeTruthy();
		expect(screen.queryByText("evt_1")).toBeNull();
	});
});
