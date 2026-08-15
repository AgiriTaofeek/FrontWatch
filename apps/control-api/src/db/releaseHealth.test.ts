import { afterAll, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { seedTestOrganization } from "../testHelpers/auth";
import { clickhouse } from "./clickhouse";
import { db } from "./client";
import { getReleaseHealth } from "./releaseHealth";
import { organizations, projects, releases } from "./schema";

// Integration test — hits both real local Postgres (the release row)
// and real local ClickHouse (the telemetry it's joined against), same
// as releases.test.ts and the other db/*.ts integration tests.

const version = "1.5.0";
let projectId: string;
let organizationId: string;
const createdReleaseIds: string[] = [];
const insertedEventIds: string[] = [];

async function insertEvent(overrides: {
	eventId: string;
	eventType: "error" | "network" | "performance";
	release: string;
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
				client_timestamp: "2026-08-14 10:00:00.000",
				server_received_at: "2026-08-14 10:00:00.000",
				release: overrides.release,
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

afterAll(async () => {
	if (insertedEventIds.length > 0) {
		await clickhouse.command({
			query: `ALTER TABLE events DELETE WHERE event_id IN (${insertedEventIds.map((id) => `'${id}'`).join(",")})`,
		});
	}
	for (const id of createdReleaseIds) {
		await db.delete(releases).where(eq(releases.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
	if (organizationId) {
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
});

describe("getReleaseHealth", () => {
	it("returns null for a release that doesn't exist", async () => {
		const health = await getReleaseHealth(randomUUID(), "no-such-version");
		expect(health).toBeNull();
	});

	it("joins the Postgres release row against ClickHouse telemetry filtered to that release", async () => {
		const organization = await seedTestOrganization();
		organizationId = organization.id;

		const [project] = await db
			.insert(projects)
			.values({
				organizationId,
				publicKey: `fw_pk_release_health_${Date.now()}`,
			})
			.returning();
		if (!project) throw new Error("failed to seed test project");
		projectId = project.id;

		const [release] = await db
			.insert(releases)
			.values({ projectId, version, commitSha: "cafe1234" })
			.returning();
		if (!release) throw new Error("failed to seed test release");
		createdReleaseIds.push(release.id);

		await insertEvent({
			eventId: `evt_err_a_${Date.now()}`,
			eventType: "error",
			release: version,
			payload: { message: "boom", exception_type: "TypeError", handled: false },
		});
		await insertEvent({
			eventId: `evt_err_b_${Date.now()}`,
			eventType: "error",
			release: version,
			// Same exception_type -> same fingerprint -> same issue, second
			// occurrence, not a second issue.
			payload: {
				message: "boom again",
				exception_type: "TypeError",
				handled: false,
			},
		});
		await insertEvent({
			eventId: `evt_net_a_${Date.now()}`,
			eventType: "network",
			release: version,
			payload: {
				method: "GET",
				resource: "/api/x",
				status: 200,
				duration_ms: 50,
				outcome: "success",
			},
		});
		await insertEvent({
			eventId: `evt_net_b_${Date.now()}`,
			eventType: "network",
			release: version,
			payload: {
				method: "GET",
				resource: "/api/x",
				status: 500,
				duration_ms: 50,
				outcome: "failure",
			},
		});
		await insertEvent({
			eventId: `evt_perf_a_${Date.now()}`,
			eventType: "performance",
			release: version,
			payload: {
				metric_name: "LCP",
				value: 1800,
				rating: "good",
				navigation_type: "navigate",
			},
		});

		const health = await getReleaseHealth(projectId, version);

		expect(health).not.toBeNull();
		expect(health?.version).toBe(version);
		expect(health?.commitSha).toBe("cafe1234");
		expect(health?.errorCount).toBe(2);
		expect(health?.issueCount).toBe(1);
		expect(health?.networkRequestCount).toBe(2);
		expect(health?.networkFailureCount).toBe(1);
		expect(health?.networkFailureRate).toBe(0.5);
		expect(health?.performanceMetrics).toHaveLength(1);
		expect(health?.performanceMetrics[0]?.metricName).toBe("LCP");
	});

	it("returns a zero networkFailureRate (not NaN) for a release with no network telemetry", async () => {
		const otherVersion = "1.5.1";
		const [otherRelease] = await db
			.insert(releases)
			.values({ projectId, version: otherVersion })
			.returning();
		if (!otherRelease) throw new Error("failed to seed second test release");
		createdReleaseIds.push(otherRelease.id);

		// Only an error event, on a different release string than the
		// test above's — this release genuinely has zero network (and
		// zero performance) telemetry, the actual case under test.
		await insertEvent({
			eventId: `evt_err_only_${Date.now()}`,
			eventType: "error",
			release: otherVersion,
			payload: {
				message: "solo",
				exception_type: "RangeError",
				handled: false,
			},
		});

		const health = await getReleaseHealth(projectId, otherVersion);

		expect(health).not.toBeNull();
		expect(health?.errorCount).toBe(1);
		expect(health?.networkRequestCount).toBe(0);
		expect(health?.networkFailureCount).toBe(0);
		expect(health?.networkFailureRate).toBe(0);
		expect(Number.isNaN(health?.networkFailureRate)).toBe(false);
		expect(health?.performanceMetrics).toHaveLength(0);
	});
});
