import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { alertRules, projects } from "../db/schema";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
	seedTestProject,
} from "../testHelpers/auth";
import { alertRulesRoutes } from "./alertRules";
import { applicationHealthRoutes } from "./applicationHealth";
import { issuesRoutes } from "./issues";
import { networkRoutes } from "./network";
import { performanceRoutes } from "./performance";
import { projectsRoutes } from "./projects";
import { releasesRoutes } from "./releases";
import { sessionsRoutes } from "./sessions";

// security-architecture.md §6, "Tenant isolation (the property that
// matters most)": automated tests for org_A principal -> org_B
// resource must all fail. This file is that requirement, made real —
// one cross-tenant attempt per resource type this slice protects,
// not folded piecemeal into each route's own test file.
//
// Every case here expects 404, not 403 — lib/authorization.ts's own
// documented reasoning: a project (or a rule) a cross-tenant
// principal has no membership path to should be indistinguishable
// from one that simply doesn't exist. 403 is reserved for a
// same-organization member with too low a role — a different test
// concern, covered per-route (e.g. routes/releases.test.ts's own
// Viewer-can't-POST case), not repeated here.

const orgA = await registerTestPrincipal();
const orgB = await registerTestPrincipal();
const projectInOrgB = await seedTestProject(orgB.organizationId);

const [ruleInOrgB] = await db
	.insert(alertRules)
	.values({
		projectId: projectInOrgB.id,
		type: "new_issue",
		webhookUrl: "https://example.com/hooks/tenant-isolation-test",
	})
	.returning();
if (!ruleInOrgB) {
	throw new Error("failed to seed test alert rule");
}

afterAll(async () => {
	await db.delete(alertRules).where(eq(alertRules.id, ruleInOrgB.id));
	await db.delete(projects).where(eq(projects.id, projectInOrgB.id));
	await cleanupTestPrincipal(orgA);
	await cleanupTestPrincipal(orgB);
});

describe("cross-organization access — org_A principal against org_B's resources", () => {
	it("GET /projects/:projectId → 404, not org_B's project data", async () => {
		const response = await projectsRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /projects/:projectId/issues → 404", async () => {
		const response = await issuesRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/issues`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /projects/:projectId/network → 404", async () => {
		const response = await networkRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/network`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /projects/:projectId/sessions → 404", async () => {
		const response = await sessionsRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/sessions`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /projects/:projectId/performance → 404", async () => {
		const response = await performanceRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/performance`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /projects/:projectId/health → 404", async () => {
		const response = await applicationHealthRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/health`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /projects/:projectId/releases → 404", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/releases`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("POST /projects/:projectId/releases → 404, cannot record a release into another org's project", async () => {
		const response = await releasesRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/releases`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: orgA.cookie,
				},
				body: JSON.stringify({ version: "1.0.0-tenant-isolation-attempt" }),
			}),
		);
		expect(response.status).toBe(404);

		// Confirm nothing was actually written, not just that the
		// response code looked right.
		const rows = await db
			.select()
			.from(projects)
			.where(eq(projects.id, projectInOrgB.id));
		expect(rows).toHaveLength(1);
	});

	it("GET /projects/:projectId/alert-rules → 404", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/alert-rules`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("POST /projects/:projectId/alert-rules → 404, cannot create a rule in another org's project", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectInOrgB.id}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: orgA.cookie,
				},
				body: JSON.stringify({
					type: "new_issue",
					webhookUrl: "https://example.com/hooks/tenant-isolation-attempt",
				}),
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /alert-rules/:ruleId (flat route) → 404 for a rule in another org", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleInOrgB.id}`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("GET /alert-rules/:ruleId/events (flat route) → 404 for a rule in another org", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleInOrgB.id}/events`, {
				headers: { Cookie: orgA.cookie },
			}),
		);
		expect(response.status).toBe(404);
	});

	it("PATCH /projects/:projectId/alert-rules/:ruleId → 404, cannot toggle another org's rule", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectInOrgB.id}/alert-rules/${ruleInOrgB.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Cookie: orgA.cookie,
					},
					body: JSON.stringify({ enabled: false }),
				},
			),
		);
		expect(response.status).toBe(404);

		// Confirm the rule was genuinely untouched.
		const [rule] = await db
			.select()
			.from(alertRules)
			.where(eq(alertRules.id, ruleInOrgB.id));
		expect(rule?.enabled).toBe(true);
	});

	it("POST /projects with org_B's organizationId → 403, org_A is a real principal but not a member there", async () => {
		const response = await projectsRoutes.handle(
			new Request("http://localhost/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: orgA.cookie,
				},
				body: JSON.stringify({ organizationId: orgB.organizationId }),
			}),
		);
		expect(response.status).toBe(403);
	});
});
