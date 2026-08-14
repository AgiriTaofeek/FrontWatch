import { createFileRoute, Link } from "@tanstack/react-router";
import { IssueList } from "../features/issues/IssueList";

export const Route = createFileRoute("/projects/$projectId/issues")({
	component: IssuesPage,
});

function IssuesPage() {
	const { projectId } = Route.useParams();
	return (
		<div>
			<h1>Issues</h1>
			<nav>
				<Link to="/projects/$projectId/network" params={{ projectId }}>
					Network
				</Link>{" "}
				<Link to="/projects/$projectId/sessions" params={{ projectId }}>
					Sessions
				</Link>
			</nav>
			<IssueList projectId={projectId} />
		</div>
	);
}
