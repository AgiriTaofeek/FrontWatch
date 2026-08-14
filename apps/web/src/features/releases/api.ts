import type {
	ListReleasesResponse,
	ReleaseHealth,
} from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as the other features/*/api.ts files.
export function releasesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["releases", projectId],
		queryFn: () =>
			apiFetch<ListReleasesResponse>(`/projects/${projectId}/releases`),
	});
}

export function releaseHealthQueryOptions(projectId: string, version: string) {
	return queryOptions({
		queryKey: ["release-health", projectId, version],
		queryFn: () =>
			apiFetch<ReleaseHealth>(
				`/projects/${projectId}/releases/${version}/health`,
			),
	});
}
