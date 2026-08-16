import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "./clickhouse";
import { listNavigationTransitions } from "./navigation";

// Integration test — hits the real local ClickHouse. Inserts test rows
// directly (the write path is already proven end-to-end via the Go
// pipeline tests — this test is specifically about the GROUP BY
// aggregation logic in listNavigationTransitions).

const projectId = randomUUID();
const insertedEventIds: string[] = [];

async function insertTestEvent(overrides: {
	eventId: string;
	fromRoute: string | null;
	toRoute: string;
	navigationType: string;
	release?: string;
	clientTimestamp: string;
}) {
	insertedEventIds.push(overrides.eventId);
	const payload: Record<string, unknown> = {
		to_route: overrides.toRoute,
		navigation_type: overrides.navigationType,
	};
	if (overrides.fromRoute) {
		payload.from_route = overrides.fromRoute;
	}
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: overrides.eventId,
				project_id: projectId,
				event_type: "navigation",
				schema_version: 1,
				client_timestamp: overrides.clientTimestamp,
				server_received_at: overrides.clientTimestamp,
				release: overrides.release ?? "",
				session_id: "",
				route: overrides.toRoute,
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify(payload),
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

describe("listNavigationTransitions (ADR-023-style aggregation)", () => {
	it("groups transitions between the same two routes, counting occurrences", async () => {
		await insertTestEvent({
			eventId: `evt_a_${Date.now()}`,
			fromRoute: "/accounts",
			toRoute: "/settings",
			navigationType: "push",
			clientTimestamp: "2026-08-14 10:00:00.000",
		});
		await insertTestEvent({
			eventId: `evt_b_${Date.now()}`,
			fromRoute: "/accounts",
			toRoute: "/settings",
			navigationType: "push",
			clientTimestamp: "2026-08-14 11:00:00.000",
		});

		const transitions = await listNavigationTransitions(projectId);

		expect(transitions).toHaveLength(1);
		expect(transitions[0]?.fromRoute).toBe("/accounts");
		expect(transitions[0]?.toRoute).toBe("/settings");
		expect(transitions[0]?.transitionCount).toBe(2);
		expect(transitions[0]?.lastSeenAt).toContain("2026-08-14 11:00:00");
	});

	it("keeps different from_route values to the same to_route as separate rows", async () => {
		await insertTestEvent({
			eventId: `evt_c_${Date.now()}`,
			fromRoute: "/dashboard",
			toRoute: "/settings",
			navigationType: "push",
			clientTimestamp: "2026-08-14 12:00:00.000",
		});

		const transitions = await listNavigationTransitions(projectId);
		const fromRoutes = transitions
			.filter((t) => t.toRoute === "/settings")
			.map((t) => t.fromRoute)
			.sort();

		expect(fromRoutes).toEqual(["/accounts", "/dashboard"]);
	});

	it("ignores non-navigation events entirely", async () => {
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

		const transitions = await listNavigationTransitions(projectId);
		// The error event must not show up disguised as a navigation
		// transition (an empty to_route from JSONExtract on a mismatched
		// payload shape would be the failure mode here).
		expect(transitions.some((t) => t.toRoute === "")).toBe(false);
	});

	it("respects a release filter", async () => {
		await insertTestEvent({
			eventId: `evt_release_${Date.now()}`,
			fromRoute: "/x",
			toRoute: "/y",
			navigationType: "push",
			release: "2.0.0",
			clientTimestamp: "2026-08-14 14:00:00.000",
		});

		const transitions = await listNavigationTransitions(projectId, {
			release: "2.0.0",
		});
		expect(transitions).toHaveLength(1);
		expect(transitions[0]?.toRoute).toBe("/y");
	});

	it("returns fromRoute null for a transition with no prior route", async () => {
		await insertTestEvent({
			eventId: `evt_noprev_${Date.now()}`,
			fromRoute: null,
			toRoute: "/landing",
			navigationType: "push",
			clientTimestamp: "2026-08-14 15:00:00.000",
		});

		const transitions = await listNavigationTransitions(projectId);
		const landing = transitions.find((t) => t.toRoute === "/landing");
		expect(landing?.fromRoute).toBeNull();
	});

	it("returns an empty list for a project with no navigation events", async () => {
		const transitions = await listNavigationTransitions(randomUUID());
		expect(transitions).toHaveLength(0);
	});
});
