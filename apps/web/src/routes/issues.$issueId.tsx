import { createFileRoute } from "@tanstack/react-router";
import { IssueDetail } from "../features/issues/IssueDetail";

export const Route = createFileRoute("/issues/$issueId")({
	component: IssueDetailPage,
});

function IssueDetailPage() {
	const { issueId } = Route.useParams();
	return <IssueDetail issueId={issueId} />;
}
