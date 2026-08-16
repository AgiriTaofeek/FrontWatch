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
				<Link to="/projects/$projectId/health" params={{ projectId }}>
					Health
				</Link>{" "}
				<Link to="/projects/$projectId/navigation" params={{ projectId }}>
					Navigation
				</Link>{" "}
				<Link to="/projects/$projectId/network" params={{ projectId }}>
					Network
				</Link>{" "}
				<Link to="/projects/$projectId/sessions" params={{ projectId }}>
					Sessions
				</Link>{" "}
				<Link to="/projects/$projectId/performance" params={{ projectId }}>
					Performance
				</Link>{" "}
				<Link to="/projects/$projectId/releases" params={{ projectId }}>
					Releases
				</Link>{" "}
				<Link to="/projects/$projectId/alert-rules" params={{ projectId }}>
					Alerts
				</Link>
			</nav>
			<IssueList projectId={projectId} />
		</div>
	);
}
