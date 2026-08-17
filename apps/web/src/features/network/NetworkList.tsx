import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	DEFAULT_FILTER_BAR_VALUE,
	FilterBar,
	type FilterBarValue,
} from "../../components/FilterBar";
import { networkResourcesQueryOptions } from "./api";

// No per-resource detail page yet (unlike issues -> issue detail) —
// there's no natural drill-down target for a network resource the way
// an issue has occurrences; deferred until there's a real need for one.
export function NetworkList({ projectId }: { projectId: string }) {
	const [filters, setFilters] = useState<FilterBarValue>(
		DEFAULT_FILTER_BAR_VALUE,
	);
	const { data } = useSuspenseQuery(
		networkResourcesQueryOptions(projectId, filters),
	);

	return (
		<div>
			<FilterBar value={filters} onChange={setFilters} />
			{data.resources.length === 0 ? (
				<p>No network requests recorded for this project.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Method</th>
							<th>Resource</th>
							<th>Requests</th>
							<th>Failure rate</th>
							<th>p50 duration</th>
							<th>p95 duration</th>
							<th>Last seen</th>
						</tr>
					</thead>
					<tbody>
						{data.resources.map((resource) => (
							<tr key={`${resource.method} ${resource.resource}`}>
								<td>{resource.method}</td>
								<td>{resource.resource}</td>
								<td>{resource.requestCount}</td>
								<td>{formatPercent(resource.failureRate)}</td>
								<td>{formatDuration(resource.p50DurationMs)}</td>
								<td>{formatDuration(resource.p95DurationMs)}</td>
								<td>{resource.lastSeenAt}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

function formatPercent(rate: number): string {
	return `${(rate * 100).toFixed(1)}%`;
}

function formatDuration(ms: number): string {
	return `${Math.round(ms)}ms`;
}
