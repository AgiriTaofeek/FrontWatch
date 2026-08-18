import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	DEFAULT_FILTER_BAR_VALUE,
	FilterBar,
	type FilterBarValue,
	isFilterActive,
} from "../../components/FilterBar";
import { sessionsQueryOptions } from "./api";

export function SessionList({ projectId }: { projectId: string }) {
	const [filters, setFilters] = useState<FilterBarValue>(
		DEFAULT_FILTER_BAR_VALUE,
	);
	const { data } = useSuspenseQuery(sessionsQueryOptions(projectId, filters));

	return (
		<div>
			<FilterBar
				value={filters}
				onChange={setFilters}
				showReleaseFilter={false}
			/>
			{data.sessions.length === 0 ? (
				<p>
					{isFilterActive(filters)
						? "No sessions match the selected filters."
						: "No sessions recorded for this project."}
				</p>
			) : (
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
			)}
		</div>
	);
}
