import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { seedTestOrganization, seedTestProject } from "../testHelpers/auth";
import { getApplicationHealth } from "./applicationHealth";
import { clickhouse, toClickHouseDateTime64 } from "./clickhouse";
import { db } from "./client";
import { organizations, projects, releases } from "./schema";

// Integration test — real local Postgres (releases) + real local
// ClickHouse (telemetry), same pattern as releaseHealth.test.ts. Unlike
// that file, timestamps here are *relative to now*, not fixed — the
// telemetryStatus distinction (healthy vs. stale vs. no_telemetry) is
// inherently about "how recent is this relative to the current window,"
// which a fixed historical timestamp can't exercise meaningfully.

const insertedEventIds: string[] = [];
const createdReleaseIds: string[] = [];
// Every org this file creates, not just the last one — each test below
// calls newProject() for its own isolated project, so cleanup has to
// track all of them, not overwrite a single variable.
const createdOrganizationIds: string[] = [];

afterAll(async () => {
	if (insertedEventIds.length > 0) {
		await clickhouse.command({
			query: `ALTER TABLE events DELETE WHERE event_id IN (${insertedEventIds.map((id) => `'${id}'`).join(",")})`,
		});
	}
	for (const id of createdReleaseIds) {
		await db.delete(releases).where(eq(releases.id, id));
	}
	if (createdOrganizationIds.length > 0) {
		// projects.organizationId is a real, enforced FK (Step 9) —
		// deleting organizations first fails exactly like it should, not
		// silently. Delete every seeded project before its organization.
		await db
			.delete(projects)
			.where(inArray(projects.organizationId, createdOrganizationIds));
		await db
			.delete(organizations)
			.where(inArray(organizations.id, createdOrganizationIds));
	}
});

async function newProject(): Promise<string> {
	const org = await seedTestOrganization();
	createdOrganizationIds.push(org.id);
	const project = await seedTestProject(org.id);
	return project.id;
}

async function insertEvent(
	projectId: string,
	overrides: {
		eventId: string;
		eventType: "error" | "network" | "performance";
		clientTimestamp: Date;
		payload: Record<string, unknown>;
	},
) {
	insertedEventIds.push(overrides.eventId);
	await clickhouse.insert({
		table: "events",
		values: [
			{
				event_id: overrides.eventId,
				project_id: projectId,
				event_type: overrides.eventType,
				schema_version: 1,
				client_timestamp: toClickHouseDateTime64(overrides.clientTimestamp),
				server_received_at: toClickHouseDateTime64(overrides.clientTimestamp),
				release: "",
				session_id: "",
				route: "",
				fingerprint:
					overrides.eventType === "error"
						? String(overrides.payload.exception_type)
						: "",
				fingerprint_version: overrides.eventType === "error" ? 1 : 0,
				payload: JSON.stringify(overrides.payload),
			},
		],
		format: "JSONEachRow",
	});
}

describe("getApplicationHealth — telemetryStatus", () => {
	it("returns no_telemetry, with every telemetry field null, for a project with zero events ever", async () => {
		const projectId = await newProject();

		const health = await getApplicationHealth(projectId);

		expect(health.telemetryStatus).toBe("no_telemetry");
		expect(health.lastEventAt).toBeNull();
		expect(health.errors).toBeNull();
		expect(health.network).toBeNull();
		expect(health.performanceMetrics).toBeNull();
	});

	it("returns stale when the most recent event is older than the window", async () => {
		const projectId = await newProject();
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
		await insertEvent(projectId, {
			eventId: `evt_stale_${randomUUID()}`,
			eventType: "error",
			clientTimestamp: twoHoursAgo,
			payload: { message: "old", exception_type: "OldError", handled: false },
		});

		const health = await getApplicationHealth(projectId, 60);

		expect(health.telemetryStatus).toBe("stale");
		expect(health.lastEventAt).not.toBeNull();
		// Stale still reports null telemetry fields — there's a real
		// lastEventAt, but nothing *in the current window* to summarize,
		// and reporting zeros would misleadingly look identical to "checked
		// the window, found nothing wrong."
		expect(health.errors).toBeNull();
	});

	it("returns healthy, with real aggregates, when telemetry is recent", async () => {
		const projectId = await newProject();
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
		await insertEvent(projectId, {
			eventId: `evt_healthy_${randomUUID()}`,
			eventType: "error",
			clientTimestamp: fiveMinutesAgo,
			payload: {
				message: "recent",
				exception_type: "RecentError",
				handled: false,
			},
		});

		const health = await getApplicationHealth(projectId, 60);

		expect(health.telemetryStatus).toBe("healthy");
		expect(health.errors).not.toBeNull();
		expect(health.errors?.count).toBe(1);
		expect(health.errors?.issueCount).toBe(1);
		expect(health.network).toEqual({
			requestCount: 0,
			failureCount: 0,
			failureRate: 0,
		});
		expect(health.performanceMetrics).toEqual([]);
	});
});

describe("getApplicationHealth — error window + trend", () => {
	it("separates the current window's count from the previous window's, for a trend comparison", async () => {
		const projectId = await newProject();
		const now = Date.now();
		// 2 errors in the current 60m window, 1 in the previous 60m window.
		await insertEvent(projectId, {
			eventId: `evt_cur1_${randomUUID()}`,
			eventType: "error",
			clientTimestamp: new Date(now - 10 * 60_000),
			payload: { message: "a", exception_type: "A", handled: false },
		});
		await insertEvent(projectId, {
			eventId: `evt_cur2_${randomUUID()}`,
			eventType: "error",
			clientTimestamp: new Date(now - 20 * 60_000),
			payload: { message: "b", exception_type: "B", handled: false },
		});
		await insertEvent(projectId, {
			eventId: `evt_prev1_${randomUUID()}`,
			eventType: "error",
			clientTimestamp: new Date(now - 90 * 60_000),
			payload: { message: "c", exception_type: "C", handled: false },
		});

		const health = await getApplicationHealth(projectId, 60);

		expect(health.errors?.count).toBe(2);
		expect(health.errors?.previousWindowCount).toBe(1);
	});

	it("counts distinct fingerprints, not raw occurrences, for issueCount", async () => {
		const projectId = await newProject();
		const now = Date.now();
		// Same exception_type (same fingerprint) twice, a different one once.
		for (const id of [randomUUID(), randomUUID()]) {
			await insertEvent(projectId, {
				eventId: `evt_dup_${id}`,
				eventType: "error",
				clientTimestamp: new Date(now - 5 * 60_000),
				payload: {
					message: "repeat",
					exception_type: "RepeatError",
					handled: false,
				},
			});
		}
		await insertEvent(projectId, {
			eventId: `evt_other_${randomUUID()}`,
			eventType: "error",
			clientTimestamp: new Date(now - 5 * 60_000),
			payload: {
				message: "other",
				exception_type: "OtherError",
				handled: false,
			},
		});

		const health = await getApplicationHealth(projectId, 60);

		expect(health.errors?.count).toBe(3);
		expect(health.errors?.issueCount).toBe(2);
	});
});

describe("getApplicationHealth — network", () => {
	it("computes a real failure rate over the window", async () => {
		const projectId = await newProject();
		const now = Date.now();
		for (const outcome of ["success", "success", "success", "failure"]) {
			await insertEvent(projectId, {
				eventId: `evt_net_${randomUUID()}`,
				eventType: "network",
				clientTimestamp: new Date(now - 5 * 60_000),
				payload: {
					method: "GET",
					resource: "/api/accounts",
					status: outcome === "success" ? 200 : 500,
					duration_ms: 50,
					outcome,
				},
			});
		}

		const health = await getApplicationHealth(projectId, 60);

		expect(health.network).toEqual({
			requestCount: 4,
			failureCount: 1,
			failureRate: 0.25,
		});
	});
});

describe("getApplicationHealth — latest release", () => {
	it("surfaces the most recently deployed release regardless of telemetry status", async () => {
		const projectId = await newProject();
		const [release] = await db
			.insert(releases)
			.values({
				projectId,
				version: "2.0.0",
				deployedAt: new Date(Date.now() - 10 * 60_000),
			})
			.returning();
		if (release) createdReleaseIds.push(release.id);

		const health = await getApplicationHealth(projectId);

		// no telemetry at all yet, but the release itself still surfaces —
		// registering a release doesn't require telemetry to exist first
		// (Step 7).
		expect(health.telemetryStatus).toBe("no_telemetry");
		expect(health.latestRelease?.version).toBe("2.0.0");
	});

	it("returns null when the project has no releases", async () => {
		const projectId = await newProject();
		const health = await getApplicationHealth(projectId);
		expect(health.latestRelease).toBeNull();
	});
});
