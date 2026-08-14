import type { ListPerformanceMetricsResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/network/api.ts.
export function performanceMetricsQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["performance-metrics", projectId],
		queryFn: () =>
			apiFetch<ListPerformanceMetricsResponse>(
				`/projects/${projectId}/performance`,
			),
	});
}
