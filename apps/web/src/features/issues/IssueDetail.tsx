import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { issueQueryOptions } from "./api";

// error-investigation.md: "The issue-summary screen must answer: what
// happened? how often? when did it start? is it still happening? who
// is affected? which routes? which release?" — "who is affected" is
// now partially answerable via the session link below
// (session-investigation.md's documented entry point: "Issue ->
// affected session"), though real pseudonymous *user* context
// (US-06.03) is still not built, only session identification is.
export function IssueDetail({ issueId }: { issueId: string }) {
	const { data } = useSuspenseQuery(issueQueryOptions(issueId));
	// issueId is "{projectId}:{fingerprint}" (same composite pattern
	// db/issues.ts's parseIssueId splits server-side) — reused here so a
	// session link can be built as "{projectId}:{sessionId}" without a
	// separate projectId field on IssueDetail just for this.
	const projectId = issueId.slice(0, issueId.indexOf(":"));

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
							<th>Session</th>
							<th>Breadcrumbs</th>
						</tr>
					</thead>
					<tbody>
						{data.recentOccurrences.map((occurrence) => (
							<tr key={occurrence.eventId}>
								<td>{occurrence.occurredAt}</td>
								<td>{occurrence.release ?? "—"}</td>
								<td>{occurrence.route ?? "—"}</td>
								<td>
									{occurrence.sessionId ? (
										<Link
											to="/sessions/$sessionId"
											params={{
												sessionId: `${projectId}:${occurrence.sessionId}`,
											}}
										>
											View session
										</Link>
									) : (
										"—"
									)}
								</td>
								<td>
									{/* E07.03 "View Timeline" — the trail leading up to
									 * this specific occurrence, not a separate page. A
									 * <details> disclosure keeps the table itself compact
									 * (this is a per-row addition, could get long) while
									 * still making the trail one click away, not hidden
									 * behind a whole separate navigation. */}
									{occurrence.breadcrumbs.length === 0 ? (
										"—"
									) : (
										<details>
											<summary>
												{occurrence.breadcrumbs.length} breadcrumb
												{occurrence.breadcrumbs.length === 1 ? "" : "s"}
											</summary>
											<ol>
												{occurrence.breadcrumbs.map((breadcrumb) => (
													<li
														key={`${breadcrumb.timestamp}-${breadcrumb.category}`}
													>
														<strong>{breadcrumb.category}</strong>{" "}
														{breadcrumb.message}
													</li>
												))}
											</ol>
										</details>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
