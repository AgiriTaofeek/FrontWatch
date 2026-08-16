import { createFileRoute, Link } from "@tanstack/react-router";
import { ReleaseList } from "../features/releases/ReleaseList";

export const Route = createFileRoute("/projects/$projectId/releases")({
	component: ReleasesPage,
});

function ReleasesPage() {
	const { projectId } = Route.useParams();
	return (
		<div>
			<h1>Releases</h1>
			<nav>
				<Link to="/projects/$projectId/health" params={{ projectId }}>
					Health
				</Link>{" "}
				<Link to="/projects/$projectId/issues" params={{ projectId }}>
					Issues
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
				<Link to="/projects/$projectId/alert-rules" params={{ projectId }}>
					Alerts
				</Link>
			</nav>
			<ReleaseList projectId={projectId} />
		</div>
	);
}
