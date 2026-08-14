import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "./clickhouse";
import { getSession, listSessions, parseSessionId } from "./sessions";

// Integration test — hits the real local ClickHouse. Inserts test rows
// directly (the write path is already proven end-to-end in Step 5/7 —
// this test is specifically about the GROUP BY aggregation + timeline
// query in listSessions/getSession).

const projectId = randomUUID();
const rawSessionId = `sess_${Date.now()}`;
const insertedEventIds: string[] = [];

async function insertEvent(overrides: {
	eventId: string;
	eventType: "error" | "network";
	route?: string;
	clientTimestamp: string;
	payload: Record<string, unknown>;
}) {
	insertedEventIds.push(overrides.eventId);
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: overrides.eventId,
				project_id: projectId,
				event_type: overrides.eventType,
				schema_version: 1,
				client_timestamp: overrides.clientTimestamp,
				server_received_at: overrides.clientTimestamp,
				release: "",
				session_id: rawSessionId,
				route: overrides.route ?? "",
				fingerprint: overrides.eventType === "error" ? "some_fp" : "",
				fingerprint_version: overrides.eventType === "error" ? 1 : 0,
				payload: JSON.stringify(overrides.payload),
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

describe("listSessions / getSession (ADR-023-style aggregation)", () => {
	it("groups an error and a network event on the same session into one summary", async () => {
		await insertEvent({
			eventId: `evt_a_${Date.now()}`,
			eventType: "error",
			route: "/checkout",
			clientTimestamp: "2026-08-14 10:00:00.000",
			payload: {
				message: "Payment failed",
				exception_type: "Error",
				handled: false,
			},
		});
		await insertEvent({
			eventId: `evt_b_${Date.now()}`,
			eventType: "network",
			route: "/checkout/confirm",
			clientTimestamp: "2026-08-14 10:05:00.000",
			payload: {
				method: "POST",
				resource: "/api/pay",
				status: 500,
				duration_ms: 200,
				outcome: "failure",
			},
		});

		const sessions = await listSessions(projectId);

		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.sessionId).toBe(`${projectId}:${rawSessionId}`);
		expect(sessions[0]?.eventCount).toBe(2);
		expect(sessions[0]?.errorCount).toBe(1);
		expect(sessions[0]?.networkCount).toBe(1);
		expect(sessions[0]?.firstRoute).toBe("/checkout");
		expect(sessions[0]?.lastRoute).toBe("/checkout/confirm");
		expect(sessions[0]?.startedAt).toContain("2026-08-14 10:00:00");
		expect(sessions[0]?.lastSeenAt).toContain("2026-08-14 10:05:00");
	});

	it("getSession returns the same summary plus a chronological (oldest-first) timeline", async () => {
		const session = await getSession(projectId, rawSessionId);

		expect(session).not.toBeNull();
		expect(session?.eventCount).toBe(2);
		expect(session?.timeline).toHaveLength(2);
		expect(session?.timeline[0]?.eventType).toBe("error");
		expect(session?.timeline[0]?.summary).toBe("Payment failed");
		expect(session?.timeline[1]?.eventType).toBe("network");
		expect(session?.timeline[1]?.summary).toBe("POST /api/pay -> 500");
	});

	it("getSession returns null for a session id with no events", async () => {
		const session = await getSession(projectId, "no_such_session");
		expect(session).toBeNull();
	});

	it("excludes events with no session_id from listSessions", async () => {
		const noSessionEventId = `evt_no_session_${Date.now()}`;
		insertedEventIds.push(noSessionEventId);
		await clickhouse.insert({
			table: "events",
			values: [
				{
					event_id: noSessionEventId,
					project_id: projectId,
					event_type: "error",
					schema_version: 1,
					client_timestamp: "2026-08-14 11:00:00.000",
					server_received_at: "2026-08-14 11:00:00.000",
					release: "",
					session_id: "",
					route: "",
					fingerprint: "other_fp",
					fingerprint_version: 1,
					payload: JSON.stringify({
						message: "orphan",
						exception_type: "Error",
						handled: false,
					}),
				},
			],
			format: "JSONEachRow",
		});

		const sessions = await listSessions(projectId);
		// Still just the one real session from the earlier test, not a
		// second "" session masquerading as one.
		expect(sessions).toHaveLength(1);
	});

	it("returns an empty list for a project with no sessions", async () => {
		const sessions = await listSessions(randomUUID());
		expect(sessions).toHaveLength(0);
	});
});

describe("parseSessionId", () => {
	it("splits on the first colon", () => {
		expect(parseSessionId("proj_123:sess_abc:def")).toEqual({
			projectId: "proj_123",
			rawSessionId: "sess_abc:def",
		});
	});

	it("returns null without a colon", () => {
		expect(parseSessionId("no-colon-here")).toBeNull();
	});
});
