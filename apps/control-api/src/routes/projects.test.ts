import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { projects } from "../db/schema";
import { projectsRoutes } from "./projects";

// Integration test, not a unit test — hits the real local Postgres
// (test-strategy.md's pyramid: this belongs in the "integration" layer,
// not "unit", since it exercises the actual DB). Requires
// infra/local/docker-compose.yml running. Testing projectsRoutes directly
// rather than the app in src/index.ts, since that file calls .listen() at
// import time — importing it here would bind a real port as a side effect.

const createdIds: string[] = [];

afterAll(async () => {
	for (const id of createdIds) {
		await db.delete(projects).where(eq(projects.id, id));
	}
});

describe("POST /projects", () => {
	it("creates a project with a generated public key and default status", async () => {
		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", { method: "POST" }),
		);
		const body = await response.json();
		createdIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
		expect(body.publicKey).toStartWith("fw_pk_");
		expect(body.status).toBe("active");
		expect(body.applicationId).toBeNull();
		expect(body.environmentId).toBeNull();
	});
});

describe("GET /projects/:id", () => {
	it("reads back a project that was just created", async () => {
		const createResponse = await projectsRoutes.handle(
			new Request("http://localhost/projects", { method: "POST" }),
		);
		const created = await createResponse.json();
		createdIds.push(created.id);

		const getResponse = await projectsRoutes.handle(
			new Request(`http://localhost/projects/${created.id}`),
		);
		const fetched = await getResponse.json();

		expect(getResponse.status).toBe(200);
		expect(fetched.id).toBe(created.id);
		expect(fetched.publicKey).toBe(created.publicKey);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const response = await projectsRoutes.handle(
			new Request(
				"http://localhost/projects/00000000-0000-0000-0000-000000000000",
			),
		);

		expect(response.status).toBe(404);
	});
});
