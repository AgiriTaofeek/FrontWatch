import { afterEach, describe, expect, it } from "bun:test";
import type { ListReleasesResponse } from "@frontwatch/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { releasesQueryOptions } from "./api";
import { ReleaseList } from "./ReleaseList";

// Same RouterProvider-context reasoning as SessionList.test.tsx —
// ReleaseList renders a <Link> per row.
function renderWithReleases(projectId: string, releases: ListReleasesResponse) {
	const queryClient = new QueryClient();
	queryClient.setQueryData(releasesQueryOptions(projectId).queryKey, releases);

	const rootRoute = createRootRoute({
		component: () => (
			<QueryClientProvider client={queryClient}>
				<ReleaseList projectId={projectId} />
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

describe("ReleaseList", () => {
	it("shows the empty state when there are no releases", async () => {
		renderWithReleases("proj_1", { releases: [] });

		expect(await screen.findByText(/no releases recorded/i)).toBeTruthy();
	});

	it("renders a row per release with its key fields", async () => {
		renderWithReleases("proj_1", {
			releases: [
				{
					id: "rel_1",
					projectId: "proj_1",
					version: "1.0.0",
					commitSha: "abc123",
					deployedAt: "2026-08-14 10:00:00.000",
					createdAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		expect(await screen.findByText("1.0.0")).toBeTruthy();
		expect(screen.getByText("abc123")).toBeTruthy();
	});

	it("shows a dash when commitSha is missing", async () => {
		renderWithReleases("proj_1", {
			releases: [
				{
					id: "rel_1",
					projectId: "proj_1",
					version: "1.0.0",
					commitSha: null,
					deployedAt: "2026-08-14 10:00:00.000",
					createdAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		await screen.findByText("1.0.0");
		expect(screen.getByText("—")).toBeTruthy();
	});

	it("links each release to its health page", async () => {
		renderWithReleases("proj_1", {
			releases: [
				{
					id: "rel_1",
					projectId: "proj_1",
					version: "1.0.0",
					commitSha: null,
					deployedAt: "2026-08-14 10:00:00.000",
					createdAt: "2026-08-14 10:00:00.000",
				},
			],
		});

		const link = await screen.findByText("1.0.0");
		expect(link.closest("a")?.getAttribute("href")).toBe(
			"/releases/proj_1%3A1.0.0",
		);
	});
});
