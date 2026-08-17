import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { clickhouse } from "../db/clickhouse";
import { db } from "../db/client";
import { projects } from "../db/schema";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
	seedTestProject,
} from "../testHelpers/auth";
import { performanceRoutes } from "./performance";

// Step 9's RBAC-enforcement slice — see issues.test.ts's own comment
// for why a real Postgres project row (not a bare randomUUID()) is
// now required.

const principal = await registerTestPrincipal();
const project = await seedTestProject(principal.organizationId);
const projectId = project.id;
const eventId = `evt_perf_route_test_${Date.now()}`;

async function seedEvent() {
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: eventId,
				project_id: projectId,
				event_type: "performance",
				schema_version: 1,
				client_timestamp: "2026-08-14 12:00:00.000",
				server_received_at: "2026-08-14 12:00:00.000",
				release: "",
				session_id: "",
				route: "/dashboard",
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify({
					metric_name: "LCP",
					value: 1800,
					rating: "good",
					navigation_type: "navigate",
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

describe("GET /projects/:projectId/performance", () => {
	it("lists the seeded metric", async () => {
		await seedEvent();

		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/performance`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.metrics).toHaveLength(1);
		expect(body.metrics[0].metricName).toBe("LCP");
		expect(body.metrics[0].sampleCount).toBe(1);
		expect(body.metrics[0].goodRate).toBe(1);
	});

	it("returns an empty list for a project with no performance events", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/performance`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.metrics).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("rejects a malformed from with a clean 422, instead of silently ignoring the filter", async () => {
		const response = await performanceRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/performance?from=not-a-real-date`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(422);
	});

	it("returns 401 without a session", async () => {
		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/performance`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/performance`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});
