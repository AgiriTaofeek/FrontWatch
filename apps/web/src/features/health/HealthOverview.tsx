import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatPercent, formatValue } from "../performance/PerformanceList";
import { applicationHealthQueryOptions } from "./api";

// health-monitoring.md's own "critical distinction the system must
// never blur": Healthy vs. No telemetry vs. Telemetry stale render as
// three genuinely different screens below, not the same layout with a
// different label — a lack of data must never look like "0 errors,
// all clear."
export function HealthOverview({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(applicationHealthQueryOptions(projectId));

	return (
		<div>
			<h1>Application Health</h1>
			<p>Window: last {data.windowMinutes} minutes</p>

			{data.telemetryStatus === "no_telemetry" && (
				<p>
					<strong>No telemetry received yet.</strong> Install the SDK and send
					an event to see health data here.
				</p>
			)}

			{data.telemetryStatus === "stale" && (
				<p>
					<strong>Telemetry is stale.</strong> No events in the last{" "}
					{data.windowMinutes} minutes — last event seen at {data.lastEventAt}.
				</p>
			)}

			{data.telemetryStatus === "healthy" && data.errors && data.network && (
				<>
					<p>
						<strong>Healthy</strong> — telemetry received as recently as{" "}
						{data.lastEventAt}.
					</p>

					<section>
						<h2>Errors</h2>
						<dl>
							<dt>This window</dt>
							<dd>{data.errors.count}</dd>
							<dt>Previous window</dt>
							<dd>{data.errors.previousWindowCount}</dd>
							<dt>Active issues</dt>
							<dd>{data.errors.issueCount}</dd>
						</dl>
						<Link to="/projects/$projectId/issues" params={{ projectId }}>
							View issues
						</Link>
					</section>

					<section>
						<h2>Network</h2>
						<dl>
							<dt>Requests</dt>
							<dd>{data.network.requestCount}</dd>
							<dt>Failed</dt>
							<dd>{data.network.failureCount}</dd>
							<dt>Failure rate</dt>
							<dd>{formatPercent(data.network.failureRate)}</dd>
						</dl>
						<Link to="/projects/$projectId/network" params={{ projectId }}>
							View network
						</Link>
					</section>

					<section>
						<h2>Performance</h2>
						{data.performanceMetrics && data.performanceMetrics.length > 0 ? (
							<table>
								<thead>
									<tr>
										<th>Metric</th>
										<th>p75</th>
										<th>Good</th>
									</tr>
								</thead>
								<tbody>
									{data.performanceMetrics.map((metric) => (
										<tr key={metric.metricName}>
											<td>{metric.metricName}</td>
											<td>{formatValue(metric.metricName, metric.p75Value)}</td>
											<td>{formatPercent(metric.goodRate)}</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<p>No performance metrics in this window.</p>
						)}
						<Link to="/projects/$projectId/performance" params={{ projectId }}>
							View performance
						</Link>
					</section>
				</>
			)}

			<section>
				<h2>Latest release</h2>
				{data.latestRelease ? (
					<>
						<p>
							{data.latestRelease.version} — deployed{" "}
							{data.latestRelease.deployedAt}
						</p>
						<Link
							to="/releases/$releaseId"
							params={{
								releaseId: `${projectId}:${data.latestRelease.version}`,
							}}
						>
							View release health
						</Link>
					</>
				) : (
					<p>No releases registered for this project.</p>
				)}
			</section>
		</div>
	);
}
