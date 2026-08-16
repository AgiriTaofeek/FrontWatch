import { createFileRoute, Link } from "@tanstack/react-router";
import { HealthOverview } from "../features/health/HealthOverview";

export const Route = createFileRoute("/projects/$projectId/health")({
	component: HealthPage,
});

function HealthPage() {
	const { projectId } = Route.useParams();
	return (
		<div>
			<nav>
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
				<Link to="/projects/$projectId/releases" params={{ projectId }}>
					Releases
				</Link>{" "}
				<Link to="/projects/$projectId/alert-rules" params={{ projectId }}>
					Alerts
				</Link>
			</nav>
			<HealthOverview projectId={projectId} />
		</div>
	);
}
