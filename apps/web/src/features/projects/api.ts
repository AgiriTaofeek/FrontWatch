import { apiFetch } from "../../lib/api";

// No Project type in @frontwatch/contracts yet (Step 2's deliberate
// nullable-FK shortcut on Application/Environment, still true as of
// Step 10) — mirrors routes/projects.ts's own POST response shape
// directly rather than waiting on a contract that doesn't exist yet.
export interface Project {
	id: string;
	organizationId: string;
	applicationId: string | null;
	environmentId: string | null;
	publicKey: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

export function createProject(organizationId: string): Promise<Project> {
	return apiFetch<Project>("/projects", {
		method: "POST",
		body: { organizationId },
	});
}
