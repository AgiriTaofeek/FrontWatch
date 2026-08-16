import { useSuspenseQuery } from "@tanstack/react-query";
import { navigationTransitionsQueryOptions } from "./api";

// ui-patterns.md §4: same "No X found" empty state as NetworkList — no
// time-range filter UI exists yet here either, same reasoning.
//
// No per-transition detail page — same "no natural drill-down target"
// reasoning NetworkList's own comment already gives for network
// resources; a transition's own row is already the whole picture.
export function NavigationList({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(
		navigationTransitionsQueryOptions(projectId),
	);

	if (data.transitions.length === 0) {
		return <p>No navigation events recorded for this project.</p>;
	}

	return (
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
	);
}
