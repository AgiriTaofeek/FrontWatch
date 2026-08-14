import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "../db/clickhouse";
import { networkRoutes } from "./network";

const projectId = randomUUID();
const eventId = `evt_net_route_test_${Date.now()}`;

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

afterAll(async () => {
	await clickhouse.command({
		query: `ALTER TABLE events DELETE WHERE event_id = '${eventId}'`,
	});
});

describe("GET /projects/:projectId/network", () => {
	it("lists the seeded resource", async () => {
		await seedEvent();

		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/network`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.resources).toHaveLength(1);
		expect(body.resources[0].method).toBe("GET");
		expect(body.resources[0].resource).toBe("/api/orders/:id");
		expect(body.resources[0].requestCount).toBe(1);
	});

	it("returns an empty list for a project with no network events", async () => {
		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/network`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.resources).toHaveLength(0);
	});
});
