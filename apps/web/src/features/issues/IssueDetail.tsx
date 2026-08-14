import { useSuspenseQuery } from "@tanstack/react-query";
import { issueQueryOptions } from "./api";

// error-investigation.md: "The issue-summary screen must answer: what
// happened? how often? when did it start? is it still happening? who
// is affected? which routes? which release?" — "who is affected" isn't
// answerable yet (no session/user telemetry until Step 7), everything
// else here is.
export function IssueDetail({ issueId }: { issueId: string }) {
	const { data } = useSuspenseQuery(issueQueryOptions(issueId));

	return (
		<div>
			<h1>{data.title}</h1>
			<p>{data.exceptionType}</p>

			<dl>
				<dt>Occurrences</dt>
				<dd>{data.occurrenceCount}</dd>
				<dt>First seen</dt>
				<dd>{data.firstSeenAt}</dd>
				<dt>Last seen</dt>
				<dd>{data.lastSeenAt}</dd>
				<dt>Release</dt>
				<dd>{data.latestRelease ?? "—"}</dd>
				<dt>Route</dt>
				<dd>{data.latestRoute ?? "—"}</dd>
			</dl>

			<h2>Recent occurrences</h2>
			{data.recentOccurrences.length === 0 ? (
				<p>No occurrences recorded.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Time</th>
							<th>Release</th>
							<th>Route</th>
						</tr>
					</thead>
					<tbody>
						{data.recentOccurrences.map((occurrence) => (
							<tr key={occurrence.eventId}>
								<td>{occurrence.occurredAt}</td>
								<td>{occurrence.release ?? "—"}</td>
								<td>{occurrence.route ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
