import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "./clickhouse";
import {
	countRecentErrors,
	getIssue,
	listIssues,
	listNewIssues,
	parseIssueId,
} from "./issues";

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

describe("listNewIssues (Step 8's alert-evaluator)", () => {
	it("only returns issues whose first_seen_at is on or after `since`", async () => {
		// The fingerprint above (first seen 2026-08-14 10:00:00) predates
		// this `since` boundary, so it must not be treated as "new."
		const since = new Date("2026-08-14T10:30:00.000Z");
		const newIssues = await listNewIssues(projectId, since);
		expect(newIssues.some((issue) => issue.fingerprint === fingerprint)).toBe(
			false,
		);
	});

	it("returns an issue whose first_seen_at is on or after `since`", async () => {
		const newFingerprint = `test_new_fp_${Date.now()}`;
		const eventId = `evt_new_${Date.now()}`;
		insertedEventIds.push(eventId);
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
					release: "",
					session_id: "",
					route: "",
					fingerprint: newFingerprint,
					fingerprint_version: 1,
					payload: JSON.stringify({
						message: "A brand new failure",
						exception_type: "RangeError",
						handled: false,
					}),
				},
			],
			format: "JSONEachRow",
		});

		const since = new Date("2026-08-14T11:00:00.000Z");
		const newIssues = await listNewIssues(projectId, since);

		expect(newIssues).toHaveLength(1);
		expect(newIssues[0]?.fingerprint).toBe(newFingerprint);
		expect(newIssues[0]?.title).toBe("A brand new failure");
	});
});

describe("countRecentErrors (Step 8's error_spike alert type)", () => {
	it("counts raw error events since a timestamp, not distinct issues", async () => {
		// Reuses the module-level projectId/insertTestEvent helper (which
		// always writes event_type "error") — countRecentErrors only cares
		// about project_id + event_type + client_timestamp, so sharing the
		// project with this file's other tests (different fingerprints,
		// fixed 2026-08-14 timestamps well outside the real-time window
		// below) doesn't interfere.
		const now = new Date();
		const recentTimestamp = new Date(now.getTime() - 60_000); // 1m ago
		const oldTimestamp = new Date(now.getTime() - 3_600_000); // 1h ago

		// Three occurrences of the SAME fingerprint within the window —
		// countRecentErrors must count all three, not collapse them into
		// one the way listIssues' GROUP BY would.
		for (let i = 0; i < 3; i++) {
			const eventId = `evt_spike_${i}_${Date.now()}`;
			await insertTestEvent({
				eventId,
				clientTimestamp: recentTimestamp
					.toISOString()
					.replace("T", " ")
					.replace("Z", ""),
			});
		}
		// One occurrence outside the window — must not be counted.
		await insertTestEvent({
			eventId: `evt_spike_old_${Date.now()}`,
			clientTimestamp: oldTimestamp
				.toISOString()
				.replace("T", " ")
				.replace("Z", ""),
		});

		const since = new Date(now.getTime() - 5 * 60_000); // last 5m
		const count = await countRecentErrors(projectId, since);

		expect(count).toBe(3);
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
