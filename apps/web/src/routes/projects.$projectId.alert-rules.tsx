import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertRuleList } from "../features/alerts/AlertRuleList";

export const Route = createFileRoute("/projects/$projectId/alert-rules")({
	component: AlertRulesPage,
});

function AlertRulesPage() {
	const { projectId } = Route.useParams();
	return (
		<div>
			<h1>Alerts</h1>
			<nav>
				<Link to="/projects/$projectId/health" params={{ projectId }}>
					Health
				</Link>{" "}
				<Link to="/projects/$projectId/navigation" params={{ projectId }}>
					Navigation
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
				<Link to="/projects/$projectId/releases" params={{ projectId }}>
					Releases
				</Link>
			</nav>
			<AlertRuleList projectId={projectId} />
		</div>
	);
}
