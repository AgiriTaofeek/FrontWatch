import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { projects } from "../db/schema";
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
const createdPrincipals: TestPrincipal[] = [];

afterAll(async () => {
	// Projects before principals — a project's organization_id FK
	// would otherwise block deleting the organization underneath it.
	for (const id of createdProjectIds) {
		await db.delete(projects).where(eq(projects.id, id));
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
