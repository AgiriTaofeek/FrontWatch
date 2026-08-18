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
import { navigationRoutes } from "./navigation";

// Step 9's RBAC-enforcement slice — see issues.test.ts's own comment
// for why a real Postgres project row (not a bare randomUUID()) is
// now required.

const principal = await registerTestPrincipal();
const project = await seedTestProject(principal.organizationId);
const projectId = project.id;
const eventId = `evt_nav_route_test_${Date.now()}`;

async function seedEvent() {
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: eventId,
				project_id: projectId,
				event_type: "navigation",
				schema_version: 1,
				client_timestamp: "2026-08-14 12:00:00.000",
				server_received_at: "2026-08-14 12:00:00.000",
				release: "",
				session_id: "",
				route: "/settings",
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify({
					from_route: "/accounts",
					to_route: "/settings",
					navigation_type: "push",
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

describe("GET /projects/:projectId/navigation", () => {
	it("lists the seeded transition", async () => {
		await seedEvent();

		const response = await navigationRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/navigation`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.transitions).toHaveLength(1);
		expect(body.transitions[0].fromRoute).toBe("/accounts");
		expect(body.transitions[0].toRoute).toBe("/settings");
		expect(body.transitions[0].transitionCount).toBe(1);
	});

	it("returns an empty list for a project with no navigation events", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await navigationRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/navigation`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.transitions).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("rejects a non-numeric limit with a clean 422, not a 503", async () => {
		const response = await navigationRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/navigation?limit=abc`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(422);
	});

	it("rejects a malformed from with a clean 422, instead of silently ignoring the filter", async () => {
		const response = await navigationRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/navigation?from=not-a-real-date`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(422);
	});

	it("returns 401 without a session", async () => {
		const response = await navigationRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/navigation`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const response = await navigationRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/navigation`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});
