import type { ListPerformanceMetricsResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { FilterBarValue } from "../../components/FilterBar";
import { apiFetch } from "../../lib/api";
import { buildFilterQueryString } from "../../lib/filterQueryString";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/network/api.ts.
export function performanceMetricsQueryOptions(
	projectId: string,
	filters: FilterBarValue,
) {
	return queryOptions({
		queryKey: ["performance-metrics", projectId, filters],
		queryFn: () =>
			apiFetch<ListPerformanceMetricsResponse>(
				`/projects/${projectId}/performance${buildFilterQueryString(filters)}`,
			),
	});
}
