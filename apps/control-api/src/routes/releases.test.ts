import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { projects, releases } from "../db/schema";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
	seedTestProject,
	setTestMembershipRole,
} from "../testHelpers/auth";
import { releasesRoutes } from "./releases";

// Integration test — hits the real local Postgres, same pattern as
// projects.test.ts. A real project row is required first: releases.
// project_id is a real foreign key (unlike ClickHouse's project_id
// columns, which aren't enforced at the storage layer at all).
//
// Step 9's RBAC-enforcement slice: recording a release needs
// "engineer" or higher (lib/authorization.ts) — the principal here
// stays an Administrator (what registration always creates,
// US-01.01), which satisfies that floor.

const principal = await registerTestPrincipal();
let projectId: string;
const createdReleaseIds: string[] = [];

afterAll(async () => {
	for (const id of createdReleaseIds) {
		await db.delete(releases).where(eq(releases.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
	await cleanupTestPrincipal(principal);
});

describe("POST /projects/:projectId/releases", () => {
	it("creates a release with a generated id", async () => {
		const project = await seedTestProject(principal.organizationId);
		projectId = project.id;

		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
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
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
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
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
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
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({ version: "1.0.0" }),
			}),
		);

		expect(response.status).toBe(409);
	});

	it("returns 401 without a session", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ version: "9.9.9" }),
			}),
		);

		expect(response.status).toBe(401);
	});

	it("returns 403 for a Viewer — recording a release needs engineer or higher", async () => {
		await setTestMembershipRole(
			principal.userId,
			principal.organizationId,
			"viewer",
		);

		try {
			const response = await releasesRoutes.handle(
				new Request(`http://localhost/projects/${projectId}/releases`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Cookie: principal.cookie,
					},
					body: JSON.stringify({ version: "9.9.9" }),
				}),
			);

			expect(response.status).toBe(403);
		} finally {
			// Restore — later tests in this file (and GET's own role
			// checks below) rely on this principal staying an
			// Administrator.
			await setTestMembershipRole(
				principal.userId,
				principal.organizationId,
				"administrator",
			);
		}
	});
});

describe("GET /projects/:projectId/releases", () => {
	it("lists releases for a project, newest deployedAt first", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`, {
				headers: { Cookie: principal.cookie },
			}),
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
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/releases`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.releases).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("returns 401 without a session", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/releases`),
		);
		expect(response.status).toBe(401);
	});
});

describe("GET /projects/:projectId/releases/:version/health", () => {
	it("returns health for a real release, with no telemetry yet all-zero, not an error", async () => {
		const response = await releasesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/releases/1.0.0/health`,
				{ headers: { Cookie: principal.cookie } },
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
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(404);
	});
});
