import { createFileRoute } from "@tanstack/react-router";

// application-architecture.md's full IA has "/" as login — no auth
// exists yet (deferred to Step 9), so there's no session to redirect
// from. A real landing page (org/project switcher) needs Application/
// Environment to be real entities first, neither of which exist yet
// either (Step 2's nullable-FK shortcut). Placeholder until then.
export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return (
		<div>
			<h1>FrontWatch</h1>
			<p>
				No project switcher yet — no auth, no Application entity. Visit{" "}
				<code>/projects/:projectId/issues</code> directly with a project ID for
				now.
			</p>
		</div>
	);
}
