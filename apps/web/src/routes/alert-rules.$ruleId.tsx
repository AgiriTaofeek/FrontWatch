import { createFileRoute } from "@tanstack/react-router";
import { AlertRuleDetail } from "../features/alerts/AlertRuleDetail";

// Flat top-level route, same pattern as issues.$issueId.tsx/
// sessions.$sessionId.tsx/releases.$releaseId.tsx — deliberately NOT
// nested under /projects/$projectId/alert-rules, for the exact reason
// releases.$releaseId.tsx's own comment documents: a route sharing a
// path prefix with an existing route file becomes that route's layout
// child in TanStack Router's file-based routing, silently requiring
// an <Outlet /> the list page doesn't have. ruleId is a real Postgres
// uuid, already globally unique — no composite id needed here (unlike
// issues/sessions/releases, which compose projectId in because their
// natural key isn't already a standalone uuid).
export const Route = createFileRoute("/alert-rules/$ruleId")({
	component: AlertRuleDetailPage,
});

function AlertRuleDetailPage() {
	const { ruleId } = Route.useParams();
	return <AlertRuleDetail ruleId={ruleId} />;
}
