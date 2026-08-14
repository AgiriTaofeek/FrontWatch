import { createFileRoute, Link } from "@tanstack/react-router";
import { SessionList } from "../features/sessions/SessionList";

export const Route = createFileRoute("/projects/$projectId/sessions")({
	component: SessionsPage,
});

function SessionsPage() {
	const { projectId } = Route.useParams();
	return (
		<div>
			<h1>Sessions</h1>
			<nav>
				<Link to="/projects/$projectId/issues" params={{ projectId }}>
					Issues
				</Link>{" "}
				<Link to="/projects/$projectId/network" params={{ projectId }}>
					Network
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
			<SessionList projectId={projectId} />
		</div>
	);
}
