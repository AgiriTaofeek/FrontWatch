import type {
	ListSessionsResponse,
	SessionDetail,
} from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { FilterBarValue } from "../../components/FilterBar";
import { apiFetch } from "../../lib/api";
import { buildFilterQueryString } from "../../lib/filterQueryString";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/issues and features/network.
// No release filter here — a session spans potentially many releases,
// and listSessions's own backend filter set is from/to only, unlike
// issues/network/performance/navigation.
export function sessionsQueryOptions(
	projectId: string,
	filters: FilterBarValue,
) {
	return queryOptions({
		queryKey: ["sessions", projectId, filters],
		queryFn: () =>
			apiFetch<ListSessionsResponse>(
				`/projects/${projectId}/sessions${buildFilterQueryString(filters, { includeRelease: false })}`,
			),
	});
}

export function sessionQueryOptions(sessionId: string) {
	return queryOptions({
		queryKey: ["session", sessionId],
		queryFn: () => apiFetch<SessionDetail>(`/sessions/${sessionId}`),
	});
}
