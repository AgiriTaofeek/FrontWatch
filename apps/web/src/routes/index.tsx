import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { currentPrincipalQueryOptions, logout } from "../features/auth/api";
import { createProject } from "../features/projects/api";

// Step 10's pilot readiness dry-run: this was a pure placeholder
// ("no auth exists yet") until control-api actually got a login/
// register UI (login.tsx/register.tsx, this same pass). Still not the
// full org/project-switcher application-architecture.md's IA
// describes — Application/Environment aren't real entities yet
// (Step 2's own deferral, unchanged) and there's still no "list
// projects" endpoint (only POST /projects and GET /projects/:id) — so
// this stays a manual project-ID/create-project landing page, not a
// real switcher. What changed: it's now backed by a real session
// instead of assuming none exists.
export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const {
		data: principal,
		isPending,
		isError,
	} = useQuery(currentPrincipalQueryOptions());

	if (isPending) {
		return <p>Loading...</p>;
	}

	if (isError || !principal) {
		return <AnonymousLanding />;
	}

	return <AuthenticatedLanding principal={principal} />;
}

function AnonymousLanding() {
	return (
		<div>
			<h1>FrontWatch</h1>
			<p>
				<Link to="/login">Log in</Link> or{" "}
				<Link to="/register">register a new organization</Link>.
			</p>
		</div>
	);
}

function AuthenticatedLanding({
	principal,
}: {
	principal: {
		name: string;
		email: string;
		memberships: {
			organizationId: string;
			organizationName: string;
			role: string;
		}[];
	};
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [projectIdInput, setProjectIdInput] = useState("");

	const logoutMutation = useMutation({
		mutationFn: logout,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			navigate({ to: "/" });
		},
	});

	const primaryOrg = principal.memberships[0];
	const createProjectMutation = useMutation({
		mutationFn: () => {
			if (!primaryOrg) {
				throw new Error("no organization membership");
			}
			return createProject(primaryOrg.organizationId);
		},
	});

	return (
		<div>
			<h1>FrontWatch</h1>
			<p>
				Logged in as {principal.name} ({principal.email}).{" "}
				<button type="button" onClick={() => logoutMutation.mutate()}>
					Log out
				</button>
			</p>

			<h2>Organizations</h2>
			<ul>
				{principal.memberships.map((membership) => (
					<li key={membership.organizationId}>
						{membership.organizationName} — {membership.role}
					</li>
				))}
			</ul>

			<h2>New project</h2>
			<button
				type="button"
				onClick={() => createProjectMutation.mutate()}
				disabled={createProjectMutation.isPending || !primaryOrg}
			>
				{createProjectMutation.isPending ? "Creating..." : "Create project"}
			</button>
			{createProjectMutation.data && (
				<p>
					Created project <code>{createProjectMutation.data.id}</code> — public
					key <code>{createProjectMutation.data.publicKey}</code> (this is what
					the SDK's <code>publicKey</code> option needs).{" "}
					<Link
						to="/projects/$projectId/health"
						params={{ projectId: createProjectMutation.data.id }}
					>
						View health
					</Link>
				</p>
			)}

			<h2>Go to a project</h2>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					navigate({
						to: "/projects/$projectId/health",
						params: { projectId: projectIdInput },
					});
				}}
			>
				<input
					placeholder="project id"
					value={projectIdInput}
					onChange={(event) => setProjectIdInput(event.target.value)}
				/>
				<button type="submit">View health</button>
			</form>
		</div>
	);
}
