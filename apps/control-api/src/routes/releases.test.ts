import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { projects, releases } from "../db/schema";
import { releasesRoutes } from "./releases";

// Integration test — hits the real local Postgres, same pattern as
// projects.test.ts. A real project row is required first: releases.
// project_id is a real foreign key (unlike ClickHouse's project_id
// columns, which aren't enforced at the storage layer at all).

let projectId: string;
const createdReleaseIds: string[] = [];

async function seedProject(): Promise<string> {
	const [project] = await db
		.insert(projects)
		.values({ publicKey: `fw_pk_release_test_${Date.now()}` })
		.returning();
	if (!project) {
		throw new Error("failed to seed test project");
	}
	return project.id;
}

afterAll(async () => {
	for (const id of createdReleaseIds) {
		await db.delete(releases).where(eq(releases.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
});

describe("POST /projects/:projectId/releases", () => {
	it("creates a release with a generated id", async () => {
		projectId = await seedProject();

		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ version: "1.0.0", commitSha: "abc123" }),
			}),
		);
		const body = await response.json();
		createdReleaseIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.projectId).toBe(projectId);
		expect(body.version).toBe("1.0.0");
		expect(body.commitSha).toBe("abc123");
		expect(body.deployedAt).toBeTruthy();
	});

	it("defaults commitSha to null and deployedAt to now when omitted", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ version: "1.0.1" }),
			}),
		);
		const body = await response.json();
		createdReleaseIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.commitSha).toBeNull();
		expect(body.deployedAt).toBeTruthy();
	});

	it("respects an explicit deployedAt for backfilling", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					version: "1.0.2",
					deployedAt: "2026-01-01T00:00:00.000Z",
				}),
			}),
		);
		const body = await response.json();
		createdReleaseIds.push(body.id);

		expect(response.status).toBe(200);
		expect(new Date(body.deployedAt).toISOString()).toBe(
			"2026-01-01T00:00:00.000Z",
		);
	});

	it("rejects a duplicate (project, version) pair with 409, not a raw DB error", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ version: "1.0.0" }),
			}),
		);

		expect(response.status).toBe(409);
	});
});

describe("GET /projects/:projectId/releases", () => {
	it("lists releases for a project, newest deployedAt first", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		const versions = body.releases.map((r: { version: string }) => r.version);
		// 1.0.2 was explicitly backfilled to 2026-01-01, well before the
		// other two (created "now") — it must sort last, proving the
		// ordering is genuinely by deployedAt, not insertion order.
		expect(versions.indexOf("1.0.2")).toBe(versions.length - 1);
	});

	it("returns an empty list for a project with no releases", async () => {
		const otherProjectId = await seedProject();

		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${otherProjectId}/releases`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.releases).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProjectId));
	});
});

describe("GET /projects/:projectId/releases/:version/health", () => {
	it("returns health for a real release, with no telemetry yet all-zero, not an error", async () => {
		const response = await releasesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/releases/1.0.0/health`,
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.version).toBe("1.0.0");
		expect(body.errorCount).toBe(0);
		expect(body.issueCount).toBe(0);
		expect(body.networkFailureRate).toBe(0);
		expect(body.performanceMetrics).toHaveLength(0);
	});

	it("returns 404 for a version with no release record", async () => {
		const response = await releasesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/releases/9.9.9/health`,
			),
		);
		expect(response.status).toBe(404);
	});
});
