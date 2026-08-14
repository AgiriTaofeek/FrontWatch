import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "./clickhouse";
import { getIssue, listIssues, parseIssueId } from "./issues";

// Integration test — hits the real local ClickHouse. Inserts test rows
// directly (the write path is already proven end-to-end in Step 5 —
// this test is specifically about the GROUP BY aggregation logic in
// listIssues/getIssue, ADR-023).

const projectId = randomUUID();
const fingerprint = `test_fp_${Date.now()}`;
const insertedEventIds: string[] = [];

async function insertTestEvent(overrides: {
	eventId: string;
	release?: string;
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
				event_type: "error",
				schema_version: 1,
				client_timestamp: overrides.clientTimestamp,
				server_received_at: overrides.clientTimestamp,
				release: overrides.release ?? "",
				session_id: "",
				route: overrides.route ?? "",
				fingerprint,
				fingerprint_version: 1,
				payload: JSON.stringify({
					message: "Failed to load order 12345",
					exception_type: "TypeError",
					handled: false,
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

describe("listIssues / getIssue (ADR-023 aggregation)", () => {
	it("groups multiple occurrences of the same fingerprint into one issue", async () => {
		await insertTestEvent({
			eventId: `evt_a_${Date.now()}`,
			release: "1.0.0",
			route: "/checkout",
			clientTimestamp: "2026-08-14 10:00:00.000",
		});
		await insertTestEvent({
			eventId: `evt_b_${Date.now()}`,
			release: "1.0.1",
			route: "/checkout",
			clientTimestamp: "2026-08-14 11:00:00.000",
		});

		const issues = await listIssues(projectId);

		expect(issues).toHaveLength(1);
		expect(issues[0]?.fingerprint).toBe(fingerprint);
		expect(issues[0]?.occurrenceCount).toBe(2);
		expect(issues[0]?.firstSeenAt).toContain("2026-08-14 10:00:00");
		expect(issues[0]?.lastSeenAt).toContain("2026-08-14 11:00:00");
		// argMax(release, client_timestamp): the later occurrence's
		// release should win, not the first one inserted.
		expect(issues[0]?.latestRelease).toBe("1.0.1");
	});

	it("getIssue returns the same aggregate plus recent occurrences", async () => {
		const issue = await getIssue(projectId, fingerprint);

		expect(issue).not.toBeNull();
		expect(issue?.occurrenceCount).toBe(2);
		expect(issue?.recentOccurrences).toHaveLength(2);
		expect(issue?.recentOccurrences[0]?.route).toBe("/checkout");
	});

	it("getIssue returns null for a fingerprint with no events", async () => {
		const issue = await getIssue(projectId, "no_such_fingerprint");
		expect(issue).toBeNull();
	});

	it("listIssues respects a release filter", async () => {
		const issues = await listIssues(projectId, { release: "1.0.0" });
		// Only the first occurrence had release 1.0.0, but the fingerprint
		// still has 2 total occurrences (the filter applies to which
		// EVENTS count toward the group, matching how a customer would
		// ask "issues that happened on release 1.0.0" and still see the
		// issue's full occurrence count, not a filtered count).
		expect(issues).toHaveLength(1);
	});
});

describe("parseIssueId", () => {
	it("splits on the first colon", () => {
		expect(parseIssueId("proj_123:abc:def")).toEqual({
			projectId: "proj_123",
			fingerprint: "abc:def",
		});
	});

	it("returns null without a colon", () => {
		expect(parseIssueId("no-colon-here")).toBeNull();
	});
});
