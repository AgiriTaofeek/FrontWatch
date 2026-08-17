import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	DEFAULT_FILTER_BAR_VALUE,
	FilterBar,
	type FilterBarValue,
} from "../../components/FilterBar";
import { navigationTransitionsQueryOptions } from "./api";

// No per-transition detail page — same "no natural drill-down target"
// reasoning NetworkList's own comment already gives for network
// resources; a transition's own row is already the whole picture.
export function NavigationList({ projectId }: { projectId: string }) {
	const [filters, setFilters] = useState<FilterBarValue>(
		DEFAULT_FILTER_BAR_VALUE,
	);
	const { data } = useSuspenseQuery(
		navigationTransitionsQueryOptions(projectId, filters),
	);

	return (
		<div>
			<FilterBar value={filters} onChange={setFilters} />
			{data.transitions.length === 0 ? (
				<p>No navigation events recorded for this project.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>From</th>
							<th>To</th>
							<th>Transitions</th>
							<th>Last seen</th>
						</tr>
					</thead>
					<tbody>
						{data.transitions.map((transition) => (
							<tr key={`${transition.fromRoute} -> ${transition.toRoute}`}>
								<td>{transition.fromRoute ?? "(first navigation)"}</td>
								<td>{transition.toRoute}</td>
								<td>{transition.transitionCount}</td>
								<td>{transition.lastSeenAt}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
