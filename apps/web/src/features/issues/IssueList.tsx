import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	DEFAULT_FILTER_BAR_VALUE,
	FilterBar,
	type FilterBarValue,
} from "../../components/FilterBar";
import { issuesQueryOptions } from "./api";

export function IssueList({ projectId }: { projectId: string }) {
	const [filters, setFilters] = useState<FilterBarValue>(
		DEFAULT_FILTER_BAR_VALUE,
	);
	const { data } = useSuspenseQuery(issuesQueryOptions(projectId, filters));

	return (
		<div>
			<FilterBar value={filters} onChange={setFilters} />
			{data.issues.length === 0 ? (
				<p>No issues found for this project.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Issue</th>
							<th>Occurrences</th>
							<th>Last seen</th>
							<th>Release</th>
							<th>Route</th>
						</tr>
					</thead>
					<tbody>
						{data.issues.map((issue) => (
							<tr key={issue.issueId}>
								<td>
									<Link
										to="/issues/$issueId"
										params={{ issueId: issue.issueId }}
									>
										{issue.title}
									</Link>
									<div>{issue.exceptionType}</div>
								</td>
								<td>{issue.occurrenceCount}</td>
								<td>{issue.lastSeenAt}</td>
								<td>{issue.latestRelease ?? "—"}</td>
								<td>{issue.latestRoute ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
