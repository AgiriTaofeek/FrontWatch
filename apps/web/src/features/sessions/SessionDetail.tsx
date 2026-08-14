import { useSuspenseQuery } from "@tanstack/react-query";
import { sessionQueryOptions } from "./api";

// session-investigation.md: "Session view must show: session
// identifier, start/end time, route history, browser/device, relevant
// errors, network failures, performance events." browser/device isn't
// answerable yet (no User-Agent parsing — packages/sdk/src/context.ts's
// own comment already documents this as deliberately not built), and
// performance events don't exist yet either (Step 7's Performance
// sub-item, not started) — everything else here is real.
export function SessionDetail({ sessionId }: { sessionId: string }) {
	const { data } = useSuspenseQuery(sessionQueryOptions(sessionId));

	return (
		<div>
			<h1>{data.sessionId}</h1>

			<dl>
				<dt>Started</dt>
				<dd>{data.startedAt}</dd>
				<dt>Last seen</dt>
				<dd>{data.lastSeenAt}</dd>
				<dt>Events</dt>
				<dd>{data.eventCount}</dd>
				<dt>Errors</dt>
				<dd>{data.errorCount}</dd>
				<dt>Network</dt>
				<dd>{data.networkCount}</dd>
				<dt>First route</dt>
				<dd>{data.firstRoute ?? "—"}</dd>
				<dt>Last route</dt>
				<dd>{data.lastRoute ?? "—"}</dd>
			</dl>

			<h2>Timeline</h2>
			{data.timeline.length === 0 ? (
				<p>No events recorded.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Time</th>
							<th>Type</th>
							<th>Route</th>
							<th>Summary</th>
						</tr>
					</thead>
					<tbody>
						{data.timeline.map((event) => (
							<tr key={event.eventId}>
								<td>{event.occurredAt}</td>
								<td>{event.eventType}</td>
								<td>{event.route ?? "—"}</td>
								<td>{event.summary}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
