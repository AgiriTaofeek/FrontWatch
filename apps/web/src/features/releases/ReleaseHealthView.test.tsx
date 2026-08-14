import { afterEach, describe, expect, it } from "bun:test";
import type { ReleaseHealth } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { releaseHealthQueryOptions } from "./api";
import { ReleaseHealthView } from "./ReleaseHealthView";

// No <Link> rendered here — a plain QueryClientProvider wrapper is
// enough, no router context needed (same as SessionDetail.test.tsx).
function renderWithHealth(
	projectId: string,
	version: string,
	health: ReleaseHealth,
) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(
		releaseHealthQueryOptions(projectId, version).queryKey,
		health,
	);

	return render(
		<QueryClientProvider client={queryClient}>
			<ReleaseHealthView projectId={projectId} version={version} />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("ReleaseHealthView", () => {
	it("renders release metadata and telemetry summary fields", async () => {
		renderWithHealth("proj_1", "1.0.0", {
			id: "rel_1",
			projectId: "proj_1",
			version: "1.0.0",
			commitSha: "abc123",
			deployedAt: "2026-08-14 10:00:00.000",
			createdAt: "2026-08-14 10:00:00.000",
			errorCount: 5,
			issueCount: 2,
			networkRequestCount: 20,
			networkFailureCount: 4,
			networkFailureRate: 0.2,
			performanceMetrics: [],
		});

		expect(await screen.findByRole("heading", { name: "1.0.0" })).toBeTruthy();
		expect(screen.getByText("abc123")).toBeTruthy();
		expect(screen.getByText("5")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
		expect(screen.getByText("20.0%")).toBeTruthy();
	});

	it("shows a no-metrics message when performanceMetrics is empty", async () => {
		renderWithHealth("proj_1", "1.0.0", {
			id: "rel_1",
			projectId: "proj_1",
			version: "1.0.0",
			commitSha: null,
			deployedAt: "2026-08-14 10:00:00.000",
			createdAt: "2026-08-14 10:00:00.000",
			errorCount: 0,
			issueCount: 0,
			networkRequestCount: 0,
			networkFailureCount: 0,
			networkFailureRate: 0,
			performanceMetrics: [],
		});

		expect(
			await screen.findByText(/no performance metrics recorded/i),
		).toBeTruthy();
	});

	it("renders a row per performance metric, formatting CLS distinctly from durations", async () => {
		renderWithHealth("proj_1", "1.0.0", {
			id: "rel_1",
			projectId: "proj_1",
			version: "1.0.0",
			commitSha: null,
			deployedAt: "2026-08-14 10:00:00.000",
			createdAt: "2026-08-14 10:00:00.000",
			errorCount: 0,
			issueCount: 0,
			networkRequestCount: 0,
			networkFailureCount: 0,
			networkFailureRate: 0,
			performanceMetrics: [
				{
					metricName: "LCP",
					sampleCount: 4,
					p50Value: 1800,
					p75Value: 2200,
					goodCount: 3,
					needsImprovementCount: 1,
					poorCount: 0,
					goodRate: 0.75,
					lastSeenAt: "2026-08-14 10:00:00.000",
				},
				{
					metricName: "CLS",
					sampleCount: 4,
					p50Value: 0.05,
					p75Value: 0.08,
					goodCount: 4,
					needsImprovementCount: 0,
					poorCount: 0,
					goodRate: 1,
					lastSeenAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		expect(await screen.findByText("LCP")).toBeTruthy();
		expect(screen.getByText("1800ms")).toBeTruthy();
		expect(screen.getByText("CLS")).toBeTruthy();
		expect(screen.getByText("0.050")).toBeTruthy();
	});
});
