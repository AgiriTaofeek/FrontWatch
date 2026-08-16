import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { clickhouse, toClickHouseDateTime64 } from "../db/clickhouse";
import { db } from "../db/client";
import { projects } from "../db/schema";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
	seedTestProject,
} from "../testHelpers/auth";
import { applicationHealthRoutes } from "./applicationHealth";

// Step 9's RBAC-enforcement slice — same pattern as performance.test.ts.

const principal = await registerTestPrincipal();
const project = await seedTestProject(principal.organizationId);
const projectId = project.id;
const eventId = `evt_health_route_test_${Date.now()}`;

async function seedEvent() {
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: eventId,
				project_id: projectId,
				event_type: "error",
				schema_version: 1,
				client_timestamp: toClickHouseDateTime64(new Date()),
				server_received_at: toClickHouseDateTime64(new Date()),
				release: "",
				session_id: "",
				route: "",
				fingerprint: "HealthRouteTestError",
				fingerprint_version: 1,
				payload: JSON.stringify({
					message: "for the route test",
					exception_type: "HealthRouteTestError",
					handled: false,
				}),
			},
		],
		format: "JSONEachRow",
	});
}

afterAll(async () => {
	await clickhouse.command({
		query: `ALTER TABLE events DELETE WHERE event_id = '${eventId}'`,
	});
	await db.delete(projects).where(eq(projects.id, projectId));
	await cleanupTestPrincipal(principal);
});

describe("GET /projects/:projectId/health", () => {
	it("returns healthy with real aggregates for a project with recent telemetry", async () => {
		await seedEvent();

		const response = await applicationHealthRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/health`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.telemetryStatus).toBe("healthy");
		expect(body.errors.count).toBe(1);
	});

	it("returns no_telemetry for a project that has never received any events", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await applicationHealthRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/health`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.telemetryStatus).toBe("no_telemetry");
		expect(body.errors).toBeNull();

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("respects a custom windowMinutes query param", async () => {
		const response = await applicationHealthRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/health?windowMinutes=5`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.windowMinutes).toBe(5);
	});

	it("returns 401 without a session", async () => {
		const response = await applicationHealthRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/health`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const response = await applicationHealthRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/health`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});
