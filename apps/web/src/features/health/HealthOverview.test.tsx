import { afterEach, describe, expect, it } from "bun:test";
import type { ApplicationHealth } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { applicationHealthQueryOptions } from "./api";
import { HealthOverview } from "./HealthOverview";

// Same RouterProvider-context reasoning as IssueDetail.test.tsx — this
// component renders real <Link>s (to Issues/Network/Performance/a
// release), which throw without real router context.
function renderWithHealth(projectId: string, health: ApplicationHealth) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(
		applicationHealthQueryOptions(projectId).queryKey,
		health,
	);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<HealthOverview projectId={projectId} />
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

describe("HealthOverview — telemetry status", () => {
	it("shows a distinct message for no_telemetry, without rendering any zero-valued sections", async () => {
		renderWithHealth("proj_1", {
			telemetryStatus: "no_telemetry",
			windowMinutes: 60,
			lastEventAt: null,
			errors: null,
			network: null,
			performanceMetrics: null,
			latestRelease: null,
		});

		expect(await screen.findByText(/no telemetry received yet/i)).toBeTruthy();
		// The three per-window sections must not render at all here — not
		// render with zeros, which would look identical to "checked,
		// healthy."
		expect(screen.queryByText("Errors")).toBeNull();
		expect(screen.queryByText("Network")).toBeNull();
	});

	it("shows a distinct message for stale, including the last real event time", async () => {
		renderWithHealth("proj_1", {
			telemetryStatus: "stale",
			windowMinutes: 60,
			lastEventAt: "2026-08-14 08:00:00.000",
			errors: null,
			network: null,
			performanceMetrics: null,
			latestRelease: null,
		});

		expect(await screen.findByText(/telemetry is stale/i)).toBeTruthy();
		expect(screen.getByText(/2026-08-14 08:00:00.000/)).toBeTruthy();
		expect(screen.queryByText("Errors")).toBeNull();
	});

	it("renders the full breakdown for healthy", async () => {
		renderWithHealth("proj_1", {
			telemetryStatus: "healthy",
			windowMinutes: 60,
			lastEventAt: "2026-08-16 09:00:00.000",
			errors: { count: 3, previousWindowCount: 1, issueCount: 2 },
			network: { requestCount: 10, failureCount: 2, failureRate: 0.2 },
			performanceMetrics: [
				{
					metricName: "LCP",
					sampleCount: 4,
					p50Value: 1500,
					p75Value: 1800,
					goodCount: 3,
					needsImprovementCount: 1,
					poorCount: 0,
					goodRate: 0.75,
					lastSeenAt: "2026-08-16 09:00:00.000",
				},
			],
			latestRelease: {
				version: "4.2.0",
				deployedAt: "2026-08-16 08:00:00.000",
			},
		});

		expect(await screen.findByText("Healthy", { exact: false })).toBeTruthy();
		expect(screen.getByText("3")).toBeTruthy(); // error count
		expect(screen.getByText("20.0%")).toBeTruthy(); // network failure rate
		expect(screen.getByText("LCP")).toBeTruthy();
		expect(screen.getByText("1800ms")).toBeTruthy();
		expect(screen.getByText(/4\.2\.0/)).toBeTruthy();
	});
});

describe("HealthOverview — latest release", () => {
	it("shows a message when the project has no releases at all, independent of telemetry status", async () => {
		renderWithHealth("proj_1", {
			telemetryStatus: "no_telemetry",
			windowMinutes: 60,
			lastEventAt: null,
			errors: null,
			network: null,
			performanceMetrics: null,
			latestRelease: null,
		});

		expect(await screen.findByText(/no releases registered/i)).toBeTruthy();
	});

	it("links to the release health page with the correct composite id", async () => {
		renderWithHealth("proj_1", {
			telemetryStatus: "no_telemetry",
			windowMinutes: 60,
			lastEventAt: null,
			errors: null,
			network: null,
			performanceMetrics: null,
			latestRelease: {
				version: "4.2.0",
				deployedAt: "2026-08-16 08:00:00.000",
			},
		});

		const link = await screen.findByText("View release health");
		expect(link.getAttribute("href")).toBe("/releases/proj_1%3A4.2.0");
	});
});
