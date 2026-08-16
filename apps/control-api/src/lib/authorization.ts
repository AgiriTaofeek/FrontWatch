import type {
	AuthenticatedPrincipal,
	MembershipRole,
} from "@frontwatch/contracts";
import { getApplication } from "../db/applications";
import { getEnvironment } from "../db/environments";
import { getProject } from "../db/projects";

// api-contracts.md / auth.md's three roles, given a real permission
// ordering — the docs name the roles but never enumerate a per-role
// permission matrix, so this ranking is this codebase's own explicit
// decision (documented, not silent): Viewer is read-only by
// definition; Engineer covers day-to-day operational writes (create/
// update projects, releases, alert rules); Administrator is
// everything Engineer has today, reserved for org/member management
// once that exists (not built yet).
const ROLE_RANK: Record<MembershipRole, number> = {
	viewer: 0,
	engineer: 1,
	administrator: 2,
};

function hasSufficientRole(
	role: MembershipRole,
	minRole: MembershipRole,
): boolean {
	return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export interface AuthorizationSuccess {
	ok: true;
	organizationId: string;
	role: MembershipRole;
}

export interface AuthorizationFailure {
	ok: false;
	status: 401 | 403 | 404;
	error: string;
}

export type AuthorizationResult = AuthorizationSuccess | AuthorizationFailure;

// security-architecture.md §6: "authorization resolves principal ->
// organization membership -> application/environment/project scope ->
// requested action." One shared function every project-scoped route
// (issues/network/sessions/performance/releases/alert-rules) calls,
// instead of each reimplementing the same three checks.
//
// 404, not 403, for both "project doesn't exist" and "principal has
// no membership in its organization" — deliberately indistinguishable
// to the caller. Same tenant-isolation reasoning
// routes/alertRules.ts's PATCH already applied to a conceptually
// identical case ("belongs to a different project" -> 404, not 403):
// a cross-tenant probe shouldn't even learn that a given id exists.
// 403 is reserved for "you're a real member of the right
// organization, just without enough role" — existence was never in
// question there.
export async function authorizeProjectAccess(
	principal: AuthenticatedPrincipal | null,
	projectId: string,
	minRole: MembershipRole,
): Promise<AuthorizationResult> {
	if (!principal) {
		return { ok: false, status: 401, error: "not authenticated" };
	}

	const project = await getProject(projectId);
	if (!project) {
		return { ok: false, status: 404, error: "project not found" };
	}

	const membership = principal.memberships.find(
		(m) => m.organizationId === project.organizationId,
	);
	if (!membership) {
		return { ok: false, status: 404, error: "project not found" };
	}

	if (!hasSufficientRole(membership.role, minRole)) {
		return {
			ok: false,
			status: 403,
			error: `requires ${minRole} access or higher`,
		};
	}

	return {
		ok: true,
		organizationId: project.organizationId,
		role: membership.role,
	};
}

// Same shape as authorizeProjectAccess, one level up the hierarchy
// (data-model.md §1: Organization -> Application -> Environment ->
// Project) — routes/applications.ts's read/update routes and
// routes/environments.ts's create route (which needs to confirm the
// *application* it's attaching a new environment to is one the
// principal can act in) both need this.
export async function authorizeApplicationAccess(
	principal: AuthenticatedPrincipal | null,
	applicationId: string,
	minRole: MembershipRole,
): Promise<AuthorizationResult> {
	if (!principal) {
		return { ok: false, status: 401, error: "not authenticated" };
	}

	const application = await getApplication(applicationId);
	if (!application) {
		return { ok: false, status: 404, error: "application not found" };
	}

	const membership = principal.memberships.find(
		(m) => m.organizationId === application.organizationId,
	);
	if (!membership) {
		return { ok: false, status: 404, error: "application not found" };
	}

	if (!hasSufficientRole(membership.role, minRole)) {
		return {
			ok: false,
			status: 403,
			error: `requires ${minRole} access or higher`,
		};
	}

	return {
		ok: true,
		organizationId: application.organizationId,
		role: membership.role,
	};
}

// Same shape again, one more level down — environments.ts's read
// route. Resolves environment -> application -> organization, the
// full chain, not just the immediate parent.
export async function authorizeEnvironmentAccess(
	principal: AuthenticatedPrincipal | null,
	environmentId: string,
	minRole: MembershipRole,
): Promise<AuthorizationResult> {
	if (!principal) {
		return { ok: false, status: 401, error: "not authenticated" };
	}

	const environment = await getEnvironment(environmentId);
	if (!environment) {
		return { ok: false, status: 404, error: "environment not found" };
	}

	return authorizeApplicationAccessWithFallback(
		principal,
		environment.applicationId,
		minRole,
		"environment not found",
	);
}

// Shared by authorizeEnvironmentAccess above — same application-
// resolution logic authorizeApplicationAccess already has, but with a
// caller-supplied "not found" message so a missing/inaccessible
// *environment* doesn't leak the word "application" in its error body.
async function authorizeApplicationAccessWithFallback(
	principal: AuthenticatedPrincipal,
	applicationId: string,
	minRole: MembershipRole,
	notFoundMessage: string,
): Promise<AuthorizationResult> {
	const application = await getApplication(applicationId);
	if (!application) {
		return { ok: false, status: 404, error: notFoundMessage };
	}

	const membership = principal.memberships.find(
		(m) => m.organizationId === application.organizationId,
	);
	if (!membership) {
		return { ok: false, status: 404, error: notFoundMessage };
	}

	if (!hasSufficientRole(membership.role, minRole)) {
		return {
			ok: false,
			status: 403,
			error: `requires ${minRole} access or higher`,
		};
	}

	return {
		ok: true,
		organizationId: application.organizationId,
		role: membership.role,
	};
}

// For routes with no existing project to check against yet — creating
// a brand-new one (routes/projects.ts). Authorizes directly against
// an organization id the request itself names.
export async function authorizeOrganizationAccess(
	principal: AuthenticatedPrincipal | null,
	organizationId: string,
	minRole: MembershipRole,
): Promise<AuthorizationResult> {
	if (!principal) {
		return { ok: false, status: 401, error: "not authenticated" };
	}

	const membership = principal.memberships.find(
		(m) => m.organizationId === organizationId,
	);
	if (!membership) {
		// 403, not 404: unlike a project id (where "not found" also
		// covers "exists but you can't see it," preserving that
		// ambiguity), the organizationId here came from the
		// *authenticated principal's own request* about which org to
		// act in — there's no cross-tenant existence probe to guard
		// against by pretending the org might not exist.
		return {
			ok: false,
			status: 403,
			error: "not a member of this organization",
		};
	}

	if (!hasSufficientRole(membership.role, minRole)) {
		return {
			ok: false,
			status: 403,
			error: `requires ${minRole} access or higher`,
		};
	}

	return { ok: true, organizationId, role: membership.role };
}
