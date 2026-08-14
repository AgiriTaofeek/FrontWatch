import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "../db/clickhouse";
import { issuesRoutes } from "./issues";

const projectId = randomUUID();
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
});

describe("GET /projects/:projectId/issues", () => {
	it("lists the seeded issue", async () => {
		await seedEvent();

		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/issues`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.issues).toHaveLength(1);
		expect(body.issues[0].fingerprint).toBe(fingerprint);
		expect(body.issues[0].title).toBe("Payment failed");
	});

	it("returns an empty list for a project with no issues", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${randomUUID()}/issues`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.issues).toHaveLength(0);
	});
});

describe("GET /issues/:issueId", () => {
	it("returns issue detail with recent occurrences", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/issues/${projectId}:${fingerprint}`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.occurrenceCount).toBe(1);
		expect(body.recentOccurrences).toHaveLength(1);
		expect(body.recentOccurrences[0].eventId).toBe(eventId);
	});

	it("returns 400 for a malformed issue id (no colon)", async () => {
		const response = await issuesRoutes.handle(
			new Request("http://localhost/issues/no-colon-here"),
		);
		expect(response.status).toBe(400);
	});

	it("returns 404 for a well-formed id that doesn't match any events", async () => {
		const response = await issuesRoutes.handle(
			new Request(
				`http://localhost/issues/${randomUUID()}:no_such_fingerprint`,
			),
		);
		expect(response.status).toBe(404);
	});
});
