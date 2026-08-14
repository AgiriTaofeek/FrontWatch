import { createFileRoute } from "@tanstack/react-router";
import { SessionDetail } from "../features/sessions/SessionDetail";

export const Route = createFileRoute("/sessions/$sessionId")({
	component: SessionDetailPage,
});

function SessionDetailPage() {
	const { sessionId } = Route.useParams();
	return <SessionDetail sessionId={sessionId} />;
}
