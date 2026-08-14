import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sessionsQueryOptions } from "./api";

// ui-patterns.md §4: same "No X found" empty state as IssueList/
// NetworkList — no time-range filter UI exists yet here either, same
// reasoning.
export function SessionList({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(sessionsQueryOptions(projectId));

	if (data.sessions.length === 0) {
		return <p>No sessions recorded for this project.</p>;
	}

	return (
		<table>
			<thead>
				<tr>
					<th>Session</th>
					<th>Started</th>
					<th>Last seen</th>
					<th>Events</th>
					<th>Errors</th>
					<th>Network</th>
					<th>First route</th>
					<th>Last route</th>
				</tr>
			</thead>
			<tbody>
				{data.sessions.map((session) => (
					<tr key={session.sessionId}>
						<td>
							<Link
								to="/sessions/$sessionId"
								params={{ sessionId: session.sessionId }}
							>
								{session.sessionId}
							</Link>
						</td>
						<td>{session.startedAt}</td>
						<td>{session.lastSeenAt}</td>
						<td>{session.eventCount}</td>
						<td>{session.errorCount}</td>
						<td>{session.networkCount}</td>
						<td>{session.firstRoute ?? "—"}</td>
						<td>{session.lastRoute ?? "—"}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
