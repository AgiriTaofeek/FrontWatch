import type {
	ListSessionsResponse,
	SessionDetail,
} from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include every
// relevant filter, same pattern as features/issues and features/network.
export function sessionsQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["sessions", projectId],
		queryFn: () =>
			apiFetch<ListSessionsResponse>(`/projects/${projectId}/sessions`),
	});
}

export function sessionQueryOptions(sessionId: string) {
	return queryOptions({
		queryKey: ["session", sessionId],
		queryFn: () => apiFetch<SessionDetail>(`/sessions/${sessionId}`),
	});
}
