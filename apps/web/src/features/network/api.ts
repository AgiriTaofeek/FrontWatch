import type { ListNetworkResourcesResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { FilterBarValue } from "../../components/FilterBar";
import { apiFetch } from "../../lib/api";
import { buildFilterQueryString } from "../../lib/filterQueryString";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/issues/api.ts — filters is
// part of the key now, not just projectId, so two different filter
// selections never collide in the cache.
export function networkResourcesQueryOptions(
	projectId: string,
	filters: FilterBarValue,
) {
	return queryOptions({
		queryKey: ["network-resources", projectId, filters],
		queryFn: () =>
			apiFetch<ListNetworkResourcesResponse>(
				`/projects/${projectId}/network${buildFilterQueryString(filters)}`,
			),
	});
}
