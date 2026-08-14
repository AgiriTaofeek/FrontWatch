import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { issuesQueryOptions } from "./api";

// ui-patterns.md §4: "No issues" vs "No data for selected time range"
// vs "Telemetry unavailable" are three different messages — this pass
// only distinguishes the two that are actually reachable yet (no time-
// range filter UI exists, so that empty-state variant doesn't apply
// here yet).
export function IssueList({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(issuesQueryOptions(projectId));

	if (data.issues.length === 0) {
		return <p>No issues found for this project.</p>;
	}

	return (
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
							<Link to="/issues/$issueId" params={{ issueId: issue.issueId }}>
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
	);
}
