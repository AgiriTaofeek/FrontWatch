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
import { issuesRoutes } from "./issues";

// Step 9's RBAC-enforcement slice: every project-scoped route now
// requires a real Postgres project row (authorizeProjectAccess looks
// it up to resolve its organization) — a bare randomUUID() projectId
// used to be enough since only ClickHouse cared about it, that's no
// longer true.

const principal = await registerTestPrincipal();
const project = await seedTestProject(principal.organizationId);
const projectId = project.id;
const fingerprint = `route_test_fp_${Date.now()}`;
const eventId = `evt_route_test_${Date.now()}`;

async function seedEvent() {
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: eventId,
				project_id: projectId,
				event_type: "error",
				schema_version: 1,
				client_timestamp: "2026-08-14 12:00:00.000",
				server_received_at: "2026-08-14 12:00:00.000",
				release: "1.0.0",
				session_id: "",
				route: "/checkout",
				fingerprint,
				fingerprint_version: 1,
				payload: JSON.stringify({
					message: "Payment failed",
					exception_type: "Error",
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

describe("GET /projects/:projectId/issues", () => {
	it("lists the seeded issue", async () => {
		await seedEvent();

		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/issues`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.issues).toHaveLength(1);
		expect(body.issues[0].fingerprint).toBe(fingerprint);
		expect(body.issues[0].title).toBe("Payment failed");
	});

	it("returns an empty list for a project with no issues", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/issues`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.issues).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("returns 401 without a session", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/issues`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist (never reveals whether the id is real)", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/issues`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});

describe("GET /issues/:issueId", () => {
	it("returns issue detail with recent occurrences", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/issues/${projectId}:${fingerprint}`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.occurrenceCount).toBe(1);
		expect(body.recentOccurrences).toHaveLength(1);
		expect(body.recentOccurrences[0].eventId).toBe(eventId);
	});

	it("returns 400 for a malformed issue id (no colon)", async () => {
		const response = await issuesRoutes.handle(
			new Request("http://localhost/issues/no-colon-here", {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(400);
	});

	it("returns 401 without a session", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/issues/${projectId}:${fingerprint}`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a well-formed id that doesn't match any events", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/issues/${projectId}:no_such_fingerprint`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});
