import type { IssueDetail, ListIssuesResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { FilterBarValue } from "../../components/FilterBar";
import { apiFetch } from "../../lib/api";
import { buildFilterQueryString } from "../../lib/filterQueryString";

// application-architecture.md §"Server state": query keys include
// every relevant filter, so two different filter sets never collide
// in the cache.
export function issuesQueryOptions(projectId: string, filters: FilterBarValue) {
	return queryOptions({
		queryKey: ["issues", projectId, filters],
		queryFn: () =>
			apiFetch<ListIssuesResponse>(
				`/projects/${projectId}/issues${buildFilterQueryString(filters)}`,
			),
	});
}

export function issueQueryOptions(issueId: string) {
	return queryOptions({
		queryKey: ["issue", issueId],
		queryFn: () => apiFetch<IssueDetail>(`/issues/${issueId}`),
	});
}
