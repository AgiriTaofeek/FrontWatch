import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { releasesQueryOptions } from "./api";

// ui-patterns.md §4: same "No X found" empty state as the other
// features/*List components — no time-range filter UI exists yet here
// either, same reasoning.
export function ReleaseList({ projectId }: { projectId: string }) {
	const { data } = useSuspenseQuery(releasesQueryOptions(projectId));

	if (data.releases.length === 0) {
		return <p>No releases recorded for this project.</p>;
	}

	return (
		<table>
			<thead>
				<tr>
					<th>Version</th>
					<th>Commit</th>
					<th>Deployed</th>
				</tr>
			</thead>
			<tbody>
				{data.releases.map((release) => (
					<tr key={release.id}>
						<td>
							<Link
								to="/releases/$releaseId"
								params={{ releaseId: `${projectId}:${release.version}` }}
							>
								{release.version}
							</Link>
						</td>
						<td>{release.commitSha ?? "—"}</td>
						<td>{release.deployedAt}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
