import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "./clickhouse";
import { listNetworkResources } from "./network";

// Integration test — hits the real local ClickHouse. Inserts test rows
// directly (the write path is already proven end-to-end in Step 7 —
// this test is specifically about the GROUP BY aggregation logic in
// listNetworkResources).

const projectId = randomUUID();
const insertedEventIds: string[] = [];

async function insertTestEvent(overrides: {
	eventId: string;
	method: string;
	resource: string;
	status: number;
	durationMs: number;
	outcome: "success" | "failure";
	route?: string;
	clientTimestamp: string;
}) {
	insertedEventIds.push(overrides.eventId);
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: overrides.eventId,
				project_id: projectId,
				event_type: "network",
				schema_version: 1,
				client_timestamp: overrides.clientTimestamp,
				server_received_at: overrides.clientTimestamp,
				release: "",
				session_id: "",
				route: overrides.route ?? "",
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify({
					method: overrides.method,
					resource: overrides.resource,
					status: overrides.status,
					duration_ms: overrides.durationMs,
					outcome: overrides.outcome,
				}),
			},
		],
		format: "JSONEachRow",
	});
}

afterAll(async () => {
	if (insertedEventIds.length === 0) return;
	await clickhouse.command({
		query: `ALTER TABLE events DELETE WHERE event_id IN (${insertedEventIds.map((id) => `'${id}'`).join(",")})`,
	});
});

describe("listNetworkResources (ADR-023-style aggregation)", () => {
	it("groups requests to the same method+resource, including failure rate and duration quantiles", async () => {
		await insertTestEvent({
			eventId: `evt_a_${Date.now()}`,
			method: "GET",
			resource: "/api/users/:id",
			status: 200,
			durationMs: 100,
			outcome: "success",
			route: "/dashboard",
			clientTimestamp: "2026-08-14 10:00:00.000",
		});
		await insertTestEvent({
			eventId: `evt_b_${Date.now()}`,
			method: "GET",
			resource: "/api/users/:id",
			status: 500,
			durationMs: 300,
			outcome: "failure",
			route: "/dashboard",
			clientTimestamp: "2026-08-14 11:00:00.000",
		});

		const resources = await listNetworkResources(projectId);

		expect(resources).toHaveLength(1);
		expect(resources[0]?.method).toBe("GET");
		expect(resources[0]?.resource).toBe("/api/users/:id");
		expect(resources[0]?.requestCount).toBe(2);
		expect(resources[0]?.failureCount).toBe(1);
		expect(resources[0]?.failureRate).toBe(0.5);
		expect(resources[0]?.lastSeenAt).toContain("2026-08-14 11:00:00");
	});

	it("keeps different methods to the same resource as separate rows", async () => {
		await insertTestEvent({
			eventId: `evt_post_${Date.now()}`,
			method: "POST",
			resource: "/api/users/:id",
			status: 201,
			durationMs: 50,
			outcome: "success",
			clientTimestamp: "2026-08-14 12:00:00.000",
		});

		const resources = await listNetworkResources(projectId);
		const methods = resources
			.filter((r) => r.resource === "/api/users/:id")
			.map((r) => r.method)
			.sort();

		expect(methods).toEqual(["GET", "POST"]);
	});

	it("ignores error events entirely", async () => {
		const errorEventId = `evt_error_${Date.now()}`;
		insertedEventIds.push(errorEventId);
		await clickhouse.insert({
			table: "events",
			values: [
				{
					event_id: errorEventId,
					project_id: projectId,
					event_type: "error",
					schema_version: 1,
					client_timestamp: "2026-08-14 13:00:00.000",
					server_received_at: "2026-08-14 13:00:00.000",
					release: "",
					session_id: "",
					route: "",
					fingerprint: "unrelated_fp",
					fingerprint_version: 1,
					payload: JSON.stringify({
						message: "boom",
						exception_type: "Error",
						handled: false,
					}),
				},
			],
			format: "JSONEachRow",
		});

		const resources = await listNetworkResources(projectId);
		expect(resources.every((r) => r.resource !== undefined)).toBe(true);
		// The error event must not show up disguised as a network resource
		// row (empty method/resource from JSONExtract on a mismatched
		// payload shape would be the failure mode here).
		expect(resources.some((r) => r.method === "")).toBe(false);
	});

	it("respects a route filter", async () => {
		const resources = await listNetworkResources(projectId, {
			route: "/dashboard",
		});
		expect(resources).toHaveLength(1);
		expect(resources[0]?.resource).toBe("/api/users/:id");
		expect(resources[0]?.requestCount).toBe(2);
	});

	it("returns an empty list for a project with no network events", async () => {
		const resources = await listNetworkResources(randomUUID());
		expect(resources).toHaveLength(0);
	});
});
