import { createFileRoute } from "@tanstack/react-router";
import { ReleaseHealthView } from "../features/releases/ReleaseHealthView";

// Flat top-level route, same pattern as issues.$issueId.tsx and
// sessions.$sessionId.tsx — deliberately NOT nested under
// /projects/$projectId/releases (a real bug found the hard way: a
// child route sharing a path prefix with an existing route file
// becomes that route's layout child in TanStack Router's file-based
// routing, and needs the parent to render an <Outlet /> to ever show
// up. Confirmed by curling the running dev server directly and seeing
// the parent's "Releases" list render instead of this page's content,
// even though the router's own internal match list showed both routes
// matched successfully). releaseId is "{projectId}:{version}" — same
// composite-id pattern as IssueSummary.issueId/SessionSummary.sessionId.
export const Route = createFileRoute("/releases/$releaseId")({
	component: ReleaseHealthPage,
});

function ReleaseHealthPage() {
	const { releaseId } = Route.useParams();
	const separatorIndex = releaseId.indexOf(":");
	const projectId = releaseId.slice(0, separatorIndex);
	const version = releaseId.slice(separatorIndex + 1);

	return <ReleaseHealthView projectId={projectId} version={version} />;
}
