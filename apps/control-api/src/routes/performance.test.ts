import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "../db/clickhouse";
import { performanceRoutes } from "./performance";

const projectId = randomUUID();
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
});

describe("GET /projects/:projectId/performance", () => {
	it("lists the seeded metric", async () => {
		await seedEvent();

		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/performance`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.metrics).toHaveLength(1);
		expect(body.metrics[0].metricName).toBe("LCP");
		expect(body.metrics[0].sampleCount).toBe(1);
		expect(body.metrics[0].goodRate).toBe(1);
	});

	it("returns an empty list for a project with no performance events", async () => {
		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/performance`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.metrics).toHaveLength(0);
	});
});
