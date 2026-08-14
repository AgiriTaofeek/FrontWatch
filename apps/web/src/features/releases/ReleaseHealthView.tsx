import { useSuspenseQuery } from "@tanstack/react-query";
import { releaseHealthQueryOptions } from "./api";

// release-investigation.md's "did this release change production
// behavior?" question, answered directly: error/issue counts, network
// failure rate, and per-metric performance — everything
// release-investigation.md's flow needs before "compare previous
// release" (a real before/after comparison UI is deferred, not built
// — this page answers "how is this one release doing," not yet "how
// does it compare").
export function ReleaseHealthView({
	projectId,
	version,
}: {
	projectId: string;
	version: string;
}) {
	const { data } = useSuspenseQuery(
		releaseHealthQueryOptions(projectId, version),
	);

	return (
		<div>
			<h1>{data.version}</h1>

			<dl>
				<dt>Commit</dt>
				<dd>{data.commitSha ?? "—"}</dd>
				<dt>Deployed</dt>
				<dd>{data.deployedAt}</dd>
				<dt>Errors</dt>
				<dd>{data.errorCount}</dd>
				<dt>Issues</dt>
				<dd>{data.issueCount}</dd>
				<dt>Network requests</dt>
				<dd>{data.networkRequestCount}</dd>
				<dt>Network failure rate</dt>
				<dd>{formatPercent(data.networkFailureRate)}</dd>
			</dl>

			<h2>Performance</h2>
			{data.performanceMetrics.length === 0 ? (
				<p>No performance metrics recorded for this release.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Metric</th>
							<th>Samples</th>
							<th>p50</th>
							<th>p75</th>
							<th>Good</th>
						</tr>
					</thead>
					<tbody>
						{data.performanceMetrics.map((metric) => (
							<tr key={metric.metricName}>
								<td>{metric.metricName}</td>
								<td>{metric.sampleCount}</td>
								<td>{formatValue(metric.metricName, metric.p50Value)}</td>
								<td>{formatValue(metric.metricName, metric.p75Value)}</td>
								<td>{formatPercent(metric.goodRate)}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

// Same CLS-is-unitless reasoning as features/performance/PerformanceList.tsx.
function formatValue(metricName: string, value: number): string {
	if (metricName === "CLS") {
		return value.toFixed(3);
	}
	return `${Math.round(value)}ms`;
}

function formatPercent(rate: number): string {
	return `${(rate * 100).toFixed(1)}%`;
}
