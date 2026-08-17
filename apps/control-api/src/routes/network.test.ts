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
import { networkRoutes } from "./network";

// Step 9's RBAC-enforcement slice — see issues.test.ts's own comment
// for why a real Postgres project row (not a bare randomUUID()) is
// now required.

const principal = await registerTestPrincipal();
const project = await seedTestProject(principal.organizationId);
const projectId = project.id;
const eventId = `evt_net_route_test_${Date.now()}`;
const releaseEventId = `evt_net_route_release_test_${Date.now()}`;

async function seedEvent() {
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: eventId,
				project_id: projectId,
				event_type: "network",
				schema_version: 1,
				client_timestamp: "2026-08-14 12:00:00.000",
				server_received_at: "2026-08-14 12:00:00.000",
				release: "",
				session_id: "",
				route: "/dashboard",
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify({
					method: "GET",
					resource: "/api/orders/:id",
					status: 200,
					duration_ms: 42,
					outcome: "success",
				}),
			},
		],
		format: "JSONEachRow",
	});
}

// Real ISO-8601 client_timestamp, deliberately — proving the route's
// own timestamp gets stored the same way real ingestion would, so this
// event's presence/absence under a real from/to filter (also ISO-8601,
// how any real HTTP caller sends one) is a genuine end-to-end check,
// not just a unit test of the conversion function in isolation.
async function seedReleaseEvent() {
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: releaseEventId,
				project_id: projectId,
				event_type: "network",
				schema_version: 1,
				client_timestamp: "2026-08-15 06:00:00.000",
				server_received_at: "2026-08-15 06:00:00.000",
				release: "4.2.0",
				session_id: "",
				route: "/checkout",
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify({
					method: "POST",
					resource: "/api/checkout",
					status: 200,
					duration_ms: 88,
					outcome: "success",
				}),
			},
		],
		format: "JSONEachRow",
	});
}

afterAll(async () => {
	await clickhouse.command({
		query: `ALTER TABLE events DELETE WHERE event_id IN ('${eventId}', '${releaseEventId}')`,
	});
	await db.delete(projects).where(eq(projects.id, projectId));
	await cleanupTestPrincipal(principal);
});

describe("GET /projects/:projectId/network", () => {
	it("lists the seeded resource", async () => {
		await seedEvent();

		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/network`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.resources).toHaveLength(1);
		expect(body.resources[0].method).toBe("GET");
		expect(body.resources[0].resource).toBe("/api/orders/:id");
		expect(body.resources[0].requestCount).toBe(1);
	});

	it("returns an empty list for a project with no network events", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/network`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.resources).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("respects a real HTTP release filter query param — the route never exposed this before, only the db layer supported it", async () => {
		await seedReleaseEvent();

		const response = await networkRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/network?release=4.2.0`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.resources).toHaveLength(1);
		expect(body.resources[0].resource).toBe("/api/checkout");
	});

	it("respects a real ISO-8601 from/to query param, not just ClickHouse's own DateTime64 string shape", async () => {
		// Both seeded events exist by this point — this filter should
		// include only the one from 2026-08-15, proving the route
		// actually converts a real HTTP-caller-shaped ISO-8601 value
		// (parseClickHouseTimeRangeQuery) rather than requiring the
		// caller to already know ClickHouse's own "YYYY-MM-DD HH:MM:SS.mmm"
		// format — a real, previously-latent bug this route would have
		// hit the instant any real caller sent a standard from/to value.
		const response = await networkRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/network?from=2026-08-15T00:00:00.000Z&to=2026-08-16T00:00:00.000Z`,
				{ headers: { Cookie: principal.cookie } },
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.resources).toHaveLength(1);
		expect(body.resources[0].resource).toBe("/api/checkout");
	});

	it("returns 401 without a session", async () => {
		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/network`),
		);
		expect(response.status).toBe(401);
	});

	it("returns 404 for a project that doesn't exist", async () => {
		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/network`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});
});
