import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { createApplication } from "../db/applications";
import { db } from "../db/client";
import { createEnvironment } from "../db/environments";
import { applications, environments, projects } from "../db/schema";
import type { TestPrincipal } from "../testHelpers/auth";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
} from "../testHelpers/auth";
import { projectsRoutes } from "./projects";

// Integration test, not a unit test — hits the real local Postgres
// (test-strategy.md's pyramid: this belongs in the "integration" layer,
// not "unit", since it exercises the actual DB). Requires
// infra/local/docker-compose.yml running. Testing projectsRoutes directly
// rather than the app in src/index.ts, since that file calls .listen() at
// import time — importing it here would bind a real port as a side effect.
//
// Step 9's RBAC-enforcement slice: every project-scoped route needs a
// real authenticated principal now, registered via testHelpers/auth.ts
// through the actual /auth/register route.

const createdProjectIds: string[] = [];
const createdEnvironmentIds: string[] = [];
const createdApplicationIds: string[] = [];
const createdPrincipals: TestPrincipal[] = [];

afterAll(async () => {
	// Projects before environments/applications before principals — FK
	// order, same reasoning the comment above already established.
	for (const id of createdProjectIds) {
		await db.delete(projects).where(eq(projects.id, id));
	}
	for (const id of createdEnvironmentIds) {
		await db.delete(environments).where(eq(environments.id, id));
	}
	for (const id of createdApplicationIds) {
		await db.delete(applications).where(eq(applications.id, id));
	}
	for (const principal of createdPrincipals) {
		await cleanupTestPrincipal(principal);
	}
});

describe("POST /projects", () => {
	it("creates a project with a generated public key and default status, scoped to the principal's organization", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({ organizationId: principal.organizationId }),
			}),
		);
		const body = await response.json();
		createdProjectIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
		expect(body.organizationId).toBe(principal.organizationId);
		expect(body.publicKey).toStartWith("fw_pk_");
		expect(body.status).toBe("active");
		expect(body.applicationId).toBeNull();
		expect(body.environmentId).toBeNull();
	});

	it("returns 401 without a session", async () => {
		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: "00000000-0000-0000-0000-000000000000",
				}),
			}),
		);

		expect(response.status).toBe(401);
	});

	it("returns 403 for an organization the principal isn't a member of", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const otherPrincipal = await registerTestPrincipal();
		createdPrincipals.push(otherPrincipal);

		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				// principal is a real, valid, authenticated user — just not a
				// member of otherPrincipal's organization.
				body: JSON.stringify({ organizationId: otherPrincipal.organizationId }),
			}),
		);

		expect(response.status).toBe(403);
	});

	it("creates a project with a real applicationId/environmentId when both belong to the same organization", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const application = await createApplication(
			principal.organizationId,
			"Storefront",
		);
		createdApplicationIds.push(application.id);
		const environment = await createEnvironment(
			application.id,
			"Production",
			"production",
		);
		createdEnvironmentIds.push(environment.id);

		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: principal.organizationId,
					applicationId: application.id,
					environmentId: environment.id,
				}),
			}),
		);
		const body = await response.json();
		createdProjectIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.applicationId).toBe(application.id);
		expect(body.environmentId).toBe(environment.id);
	});

	it("rejects an applicationId that belongs to a different organization, not just a nonexistent one", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const otherPrincipal = await registerTestPrincipal();
		createdPrincipals.push(otherPrincipal);
		// A real, existing application — just owned by a different
		// organization than the one this request claims to create the
		// project in. A raw FK-existence check alone would let this
		// through; this is exactly the tenant-isolation gap
		// routes/projects.ts's own comment documents.
		const applicationInOtherOrg = await createApplication(
			otherPrincipal.organizationId,
			"Someone else's app",
		);
		createdApplicationIds.push(applicationInOtherOrg.id);

		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: principal.organizationId,
					applicationId: applicationInOtherOrg.id,
				}),
			}),
		);

		expect(response.status).toBe(422);
	});

	it("rejects an environmentId that doesn't belong to the given applicationId", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const applicationA = await createApplication(
			principal.organizationId,
			"App A",
		);
		createdApplicationIds.push(applicationA.id);
		const applicationB = await createApplication(
			principal.organizationId,
			"App B",
		);
		createdApplicationIds.push(applicationB.id);
		const environmentOfB = await createEnvironment(
			applicationB.id,
			"Production",
			"production",
		);
		createdEnvironmentIds.push(environmentOfB.id);

		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: principal.organizationId,
					// Claims applicationA, but the environment actually belongs
					// to applicationB — a mismatched pair, not just a foreign one.
					applicationId: applicationA.id,
					environmentId: environmentOfB.id,
				}),
			}),
		);

		expect(response.status).toBe(422);
	});
});

describe("GET /projects/:id", () => {
	it("reads back a project that was just created", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const createResponse = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({ organizationId: principal.organizationId }),
			}),
		);
		const created = await createResponse.json();
		createdProjectIds.push(created.id);

		const getResponse = await projectsRoutes.handle(
			new Request(`http://localhost/projects/${created.id}`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const fetched = await getResponse.json();

		expect(getResponse.status).toBe(200);
		expect(fetched.id).toBe(created.id);
		expect(fetched.publicKey).toBe(created.publicKey);
	});

	it("returns 401 without a session", async () => {
		const response = await projectsRoutes.handle(
			new Request(
				"http://localhost/projects/00000000-0000-0000-0000-000000000000",
			),
		);

		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const response = await projectsRoutes.handle(
			new Request(
				"http://localhost/projects/00000000-0000-0000-0000-000000000000",
				{ headers: { Cookie: principal.cookie } },
			),
		);

		expect(response.status).toBe(404);
	});
});
