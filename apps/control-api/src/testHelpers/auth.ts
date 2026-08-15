import type { MembershipRole } from "@frontwatch/contracts";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import {
	authSessions,
	memberships,
	organizations,
	projects,
	users,
} from "../db/schema";
import { generatePublicKey } from "../lib/keys";
import { authRoutes } from "../routes/auth";

// Every protected route module already `.use(authPlugin())`s itself
// (needed for its own TypeScript typing — lib/authPlugin.ts's own
// comment explains why), so a route module under test resolves
// `principal` correctly on its own from a Cookie header — no extra
// composition needed in test files beyond what's below.

// Shared setup for every route test file touched by Step 9's
// RBAC-enforcement slice — before this, a route test only needed a
// seeded project; now it also needs a real authenticated principal
// with a real membership in that project's organization.

export interface TestPrincipal {
	cookie: string;
	organizationId: string;
	userId: string;
}

let counter = 0;
function unique(prefix: string): string {
	counter += 1;
	return `${prefix}_${Date.now()}_${counter}`;
}

// Registers a brand-new organization + administrator user through the
// real /auth/register route, not a direct DB insert — the same path a
// real signup takes, so every test using this helper exercises the
// actual registration + session-issuing logic instead of a shortcut
// that could quietly drift from it.
export async function registerTestPrincipal(): Promise<TestPrincipal> {
	const response = await authRoutes.handle(
		new Request("http://localhost/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				organizationName: unique("Test Org"),
				email: `${unique("test")}@example.com`,
				name: "Test User",
				password: "a-fine-test-password",
			}),
		}),
	);
	const body = await response.json();
	const setCookie = response.headers.get("set-cookie");
	if (!setCookie) {
		throw new Error("registration did not set a session cookie");
	}

	return {
		cookie: setCookie.split(";")[0] as string,
		organizationId: body.organizationId,
		userId: body.userId,
	};
}

// Changes the given principal's own membership role in their
// organization — for tests asserting a Viewer can read but not write,
// etc. Registration always creates an Administrator (US-01.01), so
// this is the only way to exercise the other two roles without a real
// invitation flow (a real, separate, deferred feature — PROGRESS.md).
export async function setTestMembershipRole(
	userId: string,
	organizationId: string,
	role: MembershipRole,
): Promise<void> {
	await db
		.update(memberships)
		.set({ role })
		.where(
			and(
				eq(memberships.userId, userId),
				eq(memberships.organizationId, organizationId),
			),
		);
}

// Seeds a bare organization row, no user/membership/session attached —
// for db-layer tests (db/*.test.ts) that call query functions
// directly rather than going through an HTTP route, and so never
// touch a principal at all. They still need *some* real organization
// row to satisfy projects.organization_id's FK now that it's
// required; registerTestPrincipal() would work too but does far more
// than these tests need (a real password hash, a real session).
export async function seedTestOrganization() {
	const [organization] = await db
		.insert(organizations)
		.values({ name: unique("Test Org") })
		.returning();
	if (!organization) {
		throw new Error("failed to seed test organization");
	}
	return organization;
}

// Seeds a project directly (bypassing HTTP) scoped to the given
// organization — test setup speed, not something worth routing
// through a real POST /projects for every test that just needs *a*
// project to exist.
export async function seedTestProject(organizationId: string) {
	const [project] = await db
		.insert(projects)
		.values({
			organizationId,
			publicKey: generatePublicKey(),
		})
		.returning();
	if (!project) {
		throw new Error("failed to seed test project");
	}
	return project;
}

// Deletes everything registerTestPrincipal() created, in the one
// order that actually works — auth_sessions before users (a real FK
// violation this session already hit once, db/alertEvents.test.ts:
// "update or delete on table users violates foreign key constraint
// auth_sessions_user_id_users_id_fk"), memberships before both users
// and organizations. Every route test file's afterAll calls this
// instead of re-deriving the correct order itself.
export async function cleanupTestPrincipal(
	principal: Pick<TestPrincipal, "userId" | "organizationId">,
): Promise<void> {
	await db
		.delete(authSessions)
		.where(eq(authSessions.userId, principal.userId));
	await db.delete(memberships).where(eq(memberships.userId, principal.userId));
	await db.delete(users).where(eq(users.id, principal.userId));
	await db
		.delete(organizations)
		.where(eq(organizations.id, principal.organizationId));
}
