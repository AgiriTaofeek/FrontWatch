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
				</Link>
			</nav>
			<SessionList projectId={projectId} />
		</div>
	);
}
