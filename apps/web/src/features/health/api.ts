import type { ApplicationHealth } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/performance/api.ts.
export function applicationHealthQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["application-health", projectId],
		queryFn: () => apiFetch<ApplicationHealth>(`/projects/${projectId}/health`),
	});
}
