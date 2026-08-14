import type { IssueDetail, ListIssuesResponse } from "@frontwatch/contracts";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

// application-architecture.md §"Server state": query keys include
// every relevant filter, so two different filter sets never collide
// in the cache.
export function issuesQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["issues", projectId],
		queryFn: () =>
			apiFetch<ListIssuesResponse>(`/projects/${projectId}/issues`),
	});
}

export function issueQueryOptions(issueId: string) {
	return queryOptions({
		queryKey: ["issue", issueId],
		queryFn: () => apiFetch<IssueDetail>(`/issues/${issueId}`),
	});
}
