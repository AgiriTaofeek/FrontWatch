import type { ListNetworkResourcesResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/issues/api.ts.
export function networkResourcesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["network-resources", projectId],
		queryFn: () =>
			apiFetch<ListNetworkResourcesResponse>(`/projects/${projectId}/network`),
	});
}
