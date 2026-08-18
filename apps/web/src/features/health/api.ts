import type { ApplicationHealth } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/performance/api.ts.
//
// windowMinutes, not FilterBarValue — the backend's own health window is
// a duration measured back from now (US-12.01's "the time window is
// clear"), a different shape from every other feature's absolute
// from/to range, so it doesn't reuse FilterBar/buildFilterQueryString
// (code review finding 6: this route's own backend filter support
// existed since the health dashboard shipped but was never reachable
// from the UI at all — closed here).
export function applicationHealthQueryOptions(
	projectId: string,
	windowMinutes: number,
) {
	return queryOptions({
		queryKey: ["application-health", projectId, windowMinutes],
		queryFn: () =>
			apiFetch<ApplicationHealth>(
				`/projects/${projectId}/health?windowMinutes=${windowMinutes}`,
			),
	});
}
