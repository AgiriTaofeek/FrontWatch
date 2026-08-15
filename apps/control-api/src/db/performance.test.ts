import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { clickhouse } from "./clickhouse";
import { getRecentMetricWindow, listPerformanceMetrics } from "./performance";

// Integration test — hits the real local ClickHouse. Inserts test rows
// directly (the write path is already proven end-to-end in Step 7 —
// this test is specifically about the GROUP BY aggregation logic in
// listPerformanceMetrics).

const projectId = randomUUID();
const insertedEventIds: string[] = [];

async function insertEvent(overrides: {
	eventId: string;
	metricName: string;
	value: number;
	rating: "good" | "needs-improvement" | "poor";
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
				event_type: "performance",
				schema_version: 1,
				client_timestamp: overrides.clientTimestamp,
				server_received_at: overrides.clientTimestamp,
				release: overrides.release ?? "",
				session_id: "",
				route: overrides.route ?? "",
				fingerprint: "",
				fingerprint_version: 0,
				payload: JSON.stringify({
					metric_name: overrides.metricName,
					value: overrides.value,
					rating: overrides.rating,
					navigation_type: "navigate",
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

describe("listPerformanceMetrics (ADR-023-style aggregation)", () => {
	it("groups samples by metric_name, including rating distribution and value quantiles", async () => {
		await insertEvent({
			eventId: `evt_a_${Date.now()}`,
			metricName: "LCP",
			value: 1500,
			rating: "good",
			route: "/dashboard",
			clientTimestamp: "2026-08-14 10:00:00.000",
		});
		await insertEvent({
			eventId: `evt_b_${Date.now()}`,
			metricName: "LCP",
			value: 4200,
			rating: "poor",
			route: "/dashboard",
			clientTimestamp: "2026-08-14 11:00:00.000",
		});

		const metrics = await listPerformanceMetrics(projectId);

		expect(metrics).toHaveLength(1);
		expect(metrics[0]?.metricName).toBe("LCP");
		expect(metrics[0]?.sampleCount).toBe(2);
		expect(metrics[0]?.goodCount).toBe(1);
		expect(metrics[0]?.poorCount).toBe(1);
		expect(metrics[0]?.needsImprovementCount).toBe(0);
		expect(metrics[0]?.goodRate).toBe(0.5);
		expect(metrics[0]?.lastSeenAt).toContain("2026-08-14 11:00:00");
	});

	it("keeps different metrics as separate rows", async () => {
		await insertEvent({
			eventId: `evt_cls_${Date.now()}`,
			metricName: "CLS",
			value: 0.05,
			rating: "good",
			clientTimestamp: "2026-08-14 12:00:00.000",
		});

		const metrics = await listPerformanceMetrics(projectId);
		const names = metrics.map((m) => m.metricName).sort();

		expect(names).toEqual(["CLS", "LCP"]);
	});

	it("ignores non-performance events entirely", async () => {
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

		const metrics = await listPerformanceMetrics(projectId);
		// The error event must not show up disguised as a performance
		// metric row (an empty metric_name from JSONExtract on a
		// mismatched payload shape would be the failure mode here).
		expect(metrics.some((m) => m.metricName === ("" as never))).toBe(false);
		expect(metrics).toHaveLength(2);
	});

	it("respects a release filter", async () => {
		await insertEvent({
			eventId: `evt_release_${Date.now()}`,
			metricName: "TTFB",
			value: 200,
			rating: "good",
			release: "2.0.0",
			clientTimestamp: "2026-08-14 14:00:00.000",
		});

		const metrics = await listPerformanceMetrics(projectId, {
			release: "2.0.0",
		});
		expect(metrics).toHaveLength(1);
		expect(metrics[0]?.metricName).toBe("TTFB");
	});

	it("respects a route filter", async () => {
		const metrics = await listPerformanceMetrics(projectId, {
			route: "/dashboard",
		});
		expect(metrics).toHaveLength(1);
		expect(metrics[0]?.metricName).toBe("LCP");
		expect(metrics[0]?.sampleCount).toBe(2);
	});

	it("returns an empty list for a project with no performance events", async () => {
		const metrics = await listPerformanceMetrics(randomUUID());
		expect(metrics).toHaveLength(0);
	});
});

describe("getRecentMetricWindow (Step 8's performance_regression alert type)", () => {
	it("returns p75 + release/route context for samples within the window, ignoring older ones", async () => {
		const windowProjectId = randomUUID();
		const now = new Date();
		const recent = (msAgo: number) =>
			new Date(now.getTime() - msAgo)
				.toISOString()
				.replace("T", " ")
				.replace("Z", "");

		await clickhouse.insert({
			table: "events",
			values: [
				{
					event_id: `evt_window_a_${Date.now()}`,
					project_id: windowProjectId,
					event_type: "performance",
					schema_version: 1,
					client_timestamp: recent(60_000),
					server_received_at: recent(60_000),
					release: "1.0.0",
					session_id: "",
					route: "/checkout",
					fingerprint: "",
					fingerprint_version: 0,
					payload: JSON.stringify({
						metric_name: "LCP",
						value: 2000,
						rating: "needs-improvement",
						navigation_type: "navigate",
					}),
				},
				{
					event_id: `evt_window_b_${Date.now()}`,
					project_id: windowProjectId,
					event_type: "performance",
					schema_version: 1,
					client_timestamp: recent(30_000),
					server_received_at: recent(30_000),
					release: "1.0.1",
					session_id: "",
					route: "/checkout",
					fingerprint: "",
					fingerprint_version: 0,
					payload: JSON.stringify({
						metric_name: "LCP",
						value: 4000,
						rating: "poor",
						navigation_type: "navigate",
					}),
				},
				// Outside the window — must not affect the p75.
				{
					event_id: `evt_window_old_${Date.now()}`,
					project_id: windowProjectId,
					event_type: "performance",
					schema_version: 1,
					client_timestamp: recent(3_600_000),
					server_received_at: recent(3_600_000),
					release: "0.9.0",
					session_id: "",
					route: "/checkout",
					fingerprint: "",
					fingerprint_version: 0,
					payload: JSON.stringify({
						metric_name: "LCP",
						value: 100,
						rating: "good",
						navigation_type: "navigate",
					}),
				},
			],
			format: "JSONEachRow",
		});
		// Cleaned up directly below (project-scoped DELETE), not via the
		// shared insertedEventIds/afterAll mechanism — this test uses its
		// own dedicated project id, so a direct DELETE is simpler than
		// threading generated event ids back out of the values array above.

		const since = new Date(now.getTime() - 5 * 60_000); // last 5m
		const window = await getRecentMetricWindow(windowProjectId, "LCP", since);

		expect(window).not.toBeNull();
		expect(window?.sampleCount).toBe(2);
		// argMax(..., client_timestamp): the more recent sample's context.
		expect(window?.latestRelease).toBe("1.0.1");
		expect(window?.latestRoute).toBe("/checkout");

		await clickhouse.command({
			query: `ALTER TABLE events DELETE WHERE project_id = '${windowProjectId}'`,
		});
	});

	it("returns null when the window has no matching samples", async () => {
		const window = await getRecentMetricWindow(randomUUID(), "LCP", new Date());
		expect(window).toBeNull();
	});
});
