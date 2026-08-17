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
import { sessionsRoutes } from "./sessions";

// Step 9's RBAC-enforcement slice — see issues.test.ts's own comment
// for why a real Postgres project row (not a bare randomUUID()) is
// now required.

const principal = await registerTestPrincipal();
const project = await seedTestProject(principal.organizationId);
const projectId = project.id;
const rawSessionId = `sess_route_test_${Date.now()}`;
const eventId = `evt_session_route_test_${Date.now()}`;

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
				session_id: rawSessionId,
				route: "/checkout",
				fingerprint: "route_test_fp",
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

describe("GET /projects/:projectId/sessions", () => {
	it("lists the seeded session", async () => {
		await seedEvent();

		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/sessions`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.sessions).toHaveLength(1);
		expect(body.sessions[0].sessionId).toBe(`${projectId}:${rawSessionId}`);
		expect(body.sessions[0].errorCount).toBe(1);
	});

	it("returns an empty list for a project with no sessions", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/sessions`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.sessions).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("rejects a non-numeric limit with a clean 422, not a 503", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/sessions?limit=abc`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(422);
	});

	it("rejects a malformed from with a clean 422, instead of silently ignoring the filter", async () => {
		const response = await sessionsRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/sessions?from=not-a-real-date`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(422);
	});

	it("returns 401 without a session", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/sessions`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/sessions`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});

describe("GET /sessions/:sessionId", () => {
	it("returns session detail with a timeline", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/sessions/${projectId}:${rawSessionId}`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.eventCount).toBe(1);
		expect(body.timeline).toHaveLength(1);
		expect(body.timeline[0].eventId).toBe(eventId);
		expect(body.timeline[0].summary).toBe("Payment failed");
	});

	it("returns 400 for a malformed session id (no colon)", async () => {
		const response = await sessionsRoutes.handle(
			new Request("http://localhost/sessions/no-colon-here", {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(400);
	});

	it("returns 401 without a session", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/sessions/${projectId}:${rawSessionId}`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a well-formed id that doesn't match any events", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/sessions/${projectId}:no_such_session`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});
