import type { PerformanceMetricSummary } from "@frontwatch/contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	DEFAULT_FILTER_BAR_VALUE,
	FilterBar,
	type FilterBarValue,
	isFilterActive,
} from "../../components/FilterBar";
import { performanceMetricsQueryOptions } from "./api";

// No per-metric detail page — same "no natural drill-down target"
// reasoning NetworkList's own comment already gives for network
// resources; a metric's five rows are already the whole picture.
export function PerformanceList({ projectId }: { projectId: string }) {
	const [filters, setFilters] = useState<FilterBarValue>(
		DEFAULT_FILTER_BAR_VALUE,
	);
	const { data } = useSuspenseQuery(
		performanceMetricsQueryOptions(projectId, filters),
	);

	return (
		<div>
			<FilterBar value={filters} onChange={setFilters} />
			{data.metrics.length === 0 ? (
				<p>
					{isFilterActive(filters)
						? "No performance metrics match the selected filters."
						: "No performance metrics recorded for this project."}
				</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Metric</th>
							<th>Samples</th>
							<th>p50</th>
							<th>p75</th>
							<th>Good</th>
							<th>Needs improvement</th>
							<th>Poor</th>
							<th>Last seen</th>
						</tr>
					</thead>
					<tbody>
						{data.metrics.map((metric) => (
							<tr key={metric.metricName}>
								<td>{metric.metricName}</td>
								<td>{metric.sampleCount}</td>
								<td>{formatValue(metric.metricName, metric.p50Value)}</td>
								<td>{formatValue(metric.metricName, metric.p75Value)}</td>
								<td>{formatPercent(metric.goodRate)}</td>
								<td>{metric.needsImprovementCount}</td>
								<td>{metric.poorCount}</td>
								<td>{metric.lastSeenAt}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

// CLS is a unitless score (e.g. 0.05), not a duration — the other four
// Core Web Vitals (FCP/INP/LCP/TTFB) are all milliseconds. Formatting
// CLS as "0ms" would be actively misleading, not just imprecise.
// Exported — features/health/HealthOverview.tsx's compact performance
// summary reuses this rather than a second copy of the same rule.
export function formatValue(
	metricName: PerformanceMetricSummary["metricName"],
	value: number,
): string {
	if (metricName === "CLS") {
		return value.toFixed(3);
	}
	return `${Math.round(value)}ms`;
}

export function formatPercent(rate: number): string {
	return `${(rate * 100).toFixed(1)}%`;
}
