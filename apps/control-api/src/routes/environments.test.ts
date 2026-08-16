import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { applications, environments } from "../db/schema";
import type { TestPrincipal } from "../testHelpers/auth";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
} from "../testHelpers/auth";
import { applicationsRoutes } from "./applications";
import { environmentsRoutes } from "./environments";

// Integration test — real local Postgres, same pattern as
// routes/applications.test.ts.

const createdEnvironmentIds: string[] = [];
const createdApplicationIds: string[] = [];
const createdPrincipals: TestPrincipal[] = [];

async function createApplicationViaRoute(
	principal: TestPrincipal,
): Promise<string> {
	const response = await applicationsRoutes.handle(
		new Request("http://localhost/applications", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: principal.cookie,
			},
			body: JSON.stringify({
				organizationId: principal.organizationId,
				name: "Test App",
			}),
		}),
	);
	const body = await response.json();
	createdApplicationIds.push(body.id);
	return body.id;
}

afterAll(async () => {
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

describe("POST /environments", () => {
	it("creates an environment scoped to the given application", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const applicationId = await createApplicationViaRoute(principal);

		const response = await environmentsRoutes.handle(
			new Request("http://localhost/environments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					applicationId,
					name: "Production",
					type: "production",
				}),
			}),
		);
		const body = await response.json();
		createdEnvironmentIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.applicationId).toBe(applicationId);
		expect(body.name).toBe("Production");
		expect(body.type).toBe("production");
	});

	it("rejects a request with no type — the API requires an explicit choice", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const applicationId = await createApplicationViaRoute(principal);

		const response = await environmentsRoutes.handle(
			new Request("http://localhost/environments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({ applicationId, name: "Whatever" }),
			}),
		);
		expect(response.status).toBe(422);
	});

	it("returns 404 for an application the principal isn't a member of", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const otherPrincipal = await registerTestPrincipal();
		createdPrincipals.push(otherPrincipal);
		const applicationId = await createApplicationViaRoute(otherPrincipal);

		const response = await environmentsRoutes.handle(
			new Request("http://localhost/environments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					applicationId,
					name: "Production",
					type: "production",
				}),
			}),
		);
		expect(response.status).toBe(404);
	});
});

describe("GET /applications/:applicationId/environments", () => {
	it("lists environments for the application", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const applicationId = await createApplicationViaRoute(principal);

		const createResponse = await environmentsRoutes.handle(
			new Request("http://localhost/environments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					applicationId,
					name: "Production",
					type: "production",
				}),
			}),
		);
		const created = await createResponse.json();
		createdEnvironmentIds.push(created.id);

		const response = await environmentsRoutes.handle(
			new Request(
				`http://localhost/applications/${applicationId}/environments`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.environments).toHaveLength(1);
		expect(body.environments[0].id).toBe(created.id);
	});
});

describe("GET /environments/:environmentId", () => {
	it("reads back an environment that was just created", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);
		const applicationId = await createApplicationViaRoute(principal);

		const createResponse = await environmentsRoutes.handle(
			new Request("http://localhost/environments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					applicationId,
					name: "Staging",
					type: "staging",
				}),
			}),
		);
		const created = await createResponse.json();
		createdEnvironmentIds.push(created.id);

		const response = await environmentsRoutes.handle(
			new Request(`http://localhost/environments/${created.id}`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe(created.id);
		expect(body.type).toBe("staging");
	});

	it("returns 404 for an environment that doesn't exist", async () => {
		const principal = await registerTestPrincipal();
		createdPrincipals.push(principal);

		const response = await environmentsRoutes.handle(
			new Request(
				"http://localhost/environments/00000000-0000-0000-0000-000000000000",
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(404);
	});
});
