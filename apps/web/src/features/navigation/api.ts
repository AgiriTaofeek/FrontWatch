import type { ListNavigationTransitionsResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/network/api.ts.
export function navigationTransitionsQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["navigation-transitions", projectId],
		queryFn: () =>
			apiFetch<ListNavigationTransitionsResponse>(
				`/projects/${projectId}/navigation`,
			),
	});
}
