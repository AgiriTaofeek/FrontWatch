import { createFileRoute, Link } from "@tanstack/react-router";
import { NetworkList } from "../features/network/NetworkList";

export const Route = createFileRoute("/projects/$projectId/network")({
	component: NetworkPage,
});

function NetworkPage() {
	const { projectId } = Route.useParams();
	return (
		<div>
			<h1>Network</h1>
			<nav>
				<Link to="/projects/$projectId/issues" params={{ projectId }}>
					Issues
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
			<NetworkList projectId={projectId} />
		</div>
	);
}
