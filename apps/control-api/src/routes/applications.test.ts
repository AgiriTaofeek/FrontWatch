import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { applications } from "../db/schema";
import type { TestPrincipal } from "../testHelpers/auth";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
} from "../testHelpers/auth";
import { applicationsRoutes } from "./applications";

// Integration test — real local Postgres, same pattern as
// routes/projects.test.ts.

const createdApplicationIds: string[] = [];
const createdPrincipals: TestPrincipal[] = [];

afterAll(async () => {
	for (const id of createdApplicationIds) {
		await db.delete(applications).where(eq(applications.id, id));
	}
	for (const principal of createdPrincipals) {
		await cleanupTestPrincipal(principal);
	}
});

describe("POST /applications", () => {
	it("creates an application scoped to the principal's organization", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const response = await applicationsRoutes.handle(
			new Request("http://localhost/applications", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: principal.organizationId,
					name: "Storefront",
					framework: "react",
				}),
			}),
		);
		const body = await response.json();
		createdApplicationIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.organizationId).toBe(principal.organizationId);
		expect(body.name).toBe("Storefront");
		expect(body.framework).toBe("react");
		expect(body.status).toBe("active");
	});

	it("returns 401 without a session", async () => {
		const response = await applicationsRoutes.handle(
			new Request("http://localhost/applications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: "00000000-0000-0000-0000-000000000000",
					name: "x",
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

		const response = await applicationsRoutes.handle(
			new Request("http://localhost/applications", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: otherPrincipal.organizationId,
					name: "x",
				}),
			}),
		);
		expect(response.status).toBe(403);
	});
});

describe("GET /organizations/:organizationId/applications", () => {
	it("lists applications for the organization", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const createResponse = await applicationsRoutes.handle(
			new Request("http://localhost/applications", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: principal.organizationId,
					name: "Storefront",
				}),
			}),
		);
		const created = await createResponse.json();
		createdApplicationIds.push(created.id);

		const response = await applicationsRoutes.handle(
			new Request(
				`http://localhost/organizations/${principal.organizationId}/applications`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.applications).toHaveLength(1);
		expect(body.applications[0].id).toBe(created.id);
	});

	it("returns 403 for an organization the principal isn't a member of", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const otherPrincipal = await registerTestPrincipal();
		createdPrincipals.push(otherPrincipal);

		const response = await applicationsRoutes.handle(
			new Request(
				`http://localhost/organizations/${otherPrincipal.organizationId}/applications`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(403);
	});
});

describe("GET /applications/:applicationId", () => {
	it("reads back an application that was just created", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const createResponse = await applicationsRoutes.handle(
			new Request("http://localhost/applications", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					organizationId: principal.organizationId,
					name: "Storefront",
				}),
			}),
		);
		const created = await createResponse.json();
		createdApplicationIds.push(created.id);

		const response = await applicationsRoutes.handle(
			new Request(`http://localhost/applications/${created.id}`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe(created.id);
	});

	it("returns 404 for an application that doesn't exist", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const response = await applicationsRoutes.handle(
			new Request(
				"http://localhost/applications/00000000-0000-0000-0000-000000000000",
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(404);
	});
});
