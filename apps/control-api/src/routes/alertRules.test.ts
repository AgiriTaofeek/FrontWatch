import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { alertEvents, alertRules, projects } from "../db/schema";
import {
	cleanupTestPrincipal,
	registerTestPrincipal,
	seedTestProject,
	setTestMembershipRole,
} from "../testHelpers/auth";
import { alertRulesRoutes } from "./alertRules";

// Integration test — hits the real local Postgres, same pattern as
// releases.test.ts. A real project row is required first: alert_rules
// .project_id is a real foreign key.
//
// Step 9's RBAC-enforcement slice: creating/updating a rule needs
// "engineer" or higher; reading needs any active membership. The
// principal here stays an Administrator (what registration always
// creates), which satisfies both floors.

const principal = await registerTestPrincipal();
let projectId: string;
const createdRuleIds: string[] = [];

afterAll(async () => {
	for (const id of createdRuleIds) {
		await db.delete(alertEvents).where(eq(alertEvents.alertRuleId, id));
		await db.delete(alertRules).where(eq(alertRules.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
	await cleanupTestPrincipal(principal);
});

describe("POST /projects/:projectId/alert-rules", () => {
	it("creates a new_issue rule with a generated id, enabled by default", async () => {
		const project = await seedTestProject(principal.organizationId);
		projectId = project.id;

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					type: "new_issue",
					webhookUrl: "https://example.com/hooks/1",
				}),
			}),
		);
		const body = await response.json();
		createdRuleIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.projectId).toBe(projectId);
		expect(body.type).toBe("new_issue");
		expect(body.webhookUrl).toBe("https://example.com/hooks/1");
		expect(body.enabled).toBe(true);
		expect(body.windowMinutes).toBeNull();
		expect(body.thresholdCount).toBeNull();
	});

	it("rejects a malformed webhookUrl — invalid rules cannot be saved (US-13.01)", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({ type: "new_issue", webhookUrl: "not-a-url" }),
			}),
		);

		expect(response.status).toBe(422);
	});

	it("creates an error_spike rule with its threshold/window condition (US-13.02)", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					type: "error_spike",
					webhookUrl: "https://example.com/hooks/2",
					windowMinutes: 10,
					thresholdCount: 25,
				}),
			}),
		);
		const body = await response.json();
		createdRuleIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.type).toBe("error_spike");
		expect(body.windowMinutes).toBe(10);
		expect(body.thresholdCount).toBe(25);
		expect(body.metricName).toBeNull();
		expect(body.thresholdValue).toBeNull();
	});

	it("rejects an error_spike rule missing its threshold — invalid rules cannot be saved", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					type: "error_spike",
					webhookUrl: "https://example.com/hooks/2",
					windowMinutes: 10,
				}),
			}),
		);

		expect(response.status).toBe(422);
	});

	it("creates a performance_regression rule with its metric/threshold/window condition (US-13.03)", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					type: "performance_regression",
					webhookUrl: "https://example.com/hooks/3",
					windowMinutes: 15,
					metricName: "LCP",
					thresholdValue: 2500,
				}),
			}),
		);
		const body = await response.json();
		createdRuleIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.type).toBe("performance_regression");
		expect(body.windowMinutes).toBe(15);
		expect(body.metricName).toBe("LCP");
		expect(body.thresholdValue).toBe(2500);
		expect(body.thresholdCount).toBeNull();
	});

	it("rejects a performance_regression rule with an unknown metric name", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: principal.cookie,
				},
				body: JSON.stringify({
					type: "performance_regression",
					webhookUrl: "https://example.com/hooks/3",
					windowMinutes: 15,
					metricName: "NOT_A_METRIC",
					thresholdValue: 2500,
				}),
			}),
		);

		expect(response.status).toBe(422);
	});

	it("returns 401 without a session", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "new_issue",
					webhookUrl: "https://example.com/hooks/unauth",
				}),
			}),
		);

		expect(response.status).toBe(401);
	});

	it("returns 403 for a Viewer — creating a rule needs engineer or higher", async () => {
		await setTestMembershipRole(
			principal.userId,
			principal.organizationId,
			"viewer",
		);

		try {
			const response = await alertRulesRoutes.handle(
				new Request(`http://localhost/projects/${projectId}/alert-rules`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Cookie: principal.cookie,
					},
					body: JSON.stringify({
						type: "new_issue",
						webhookUrl: "https://example.com/hooks/viewer-attempt",
					}),
				}),
			);

			expect(response.status).toBe(403);
		} finally {
			await setTestMembershipRole(
				principal.userId,
				principal.organizationId,
				"administrator",
			);
		}
	});
});

describe("GET /projects/:projectId/alert-rules", () => {
	it("lists rules for a project, newest first", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		// Three rules created above (new_issue, error_spike,
		// performance_regression) — the malformed/rejected POSTs never
		// made it into createdRuleIds/the database.
		expect(response.status).toBe(200);
		expect(body.alertRules).toHaveLength(3);
		const types = body.alertRules.map((r: { type: string }) => r.type).sort();
		expect(types).toEqual([
			"error_spike",
			"new_issue",
			"performance_regression",
		]);
	});

	it("returns an empty list for a project with no rules", async () => {
		const otherProject = await seedTestProject(principal.organizationId);

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${otherProject.id}/alert-rules`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.alertRules).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("returns 401 without a session", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`),
		);
		expect(response.status).toBe(401);
	});
});

describe("PATCH /projects/:projectId/alert-rules/:ruleId", () => {
	it("disables a rule — rules can be enabled or disabled (US-13.01)", async () => {
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/alert-rules/${ruleId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Cookie: principal.cookie,
					},
					body: JSON.stringify({ enabled: false }),
				},
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.enabled).toBe(false);
	});

	it("returns 404 for a rule id that doesn't exist", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/alert-rules/00000000-0000-0000-0000-000000000000`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Cookie: principal.cookie,
					},
					body: JSON.stringify({ enabled: true }),
				},
			),
		);

		expect(response.status).toBe(404);
	});

	it("returns 404 when the rule belongs to a different project", async () => {
		const otherProject = await seedTestProject(principal.organizationId);
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(
				`http://localhost/projects/${otherProject.id}/alert-rules/${ruleId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Cookie: principal.cookie,
					},
					body: JSON.stringify({ enabled: true }),
				},
			),
		);

		expect(response.status).toBe(404);

		await db.delete(projects).where(eq(projects.id, otherProject.id));
	});

	it("returns 401 without a session", async () => {
		const ruleId = createdRuleIds[0];
		const response = await alertRulesRoutes.handle(
			new Request(
				`http://localhost/projects/${projectId}/alert-rules/${ruleId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ enabled: true }),
				},
			),
		);

		expect(response.status).toBe(401);
	});
});

describe("GET /alert-rules/:ruleId", () => {
	it("returns a rule by id alone, no project scoping needed", async () => {
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe(ruleId);
		expect(body.projectId).toBe(projectId);
	});

	it("returns 404 for a rule id that doesn't exist", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(
				"http://localhost/alert-rules/00000000-0000-0000-0000-000000000000",
				{ headers: { Cookie: principal.cookie } },
			),
		);
		expect(response.status).toBe(404);
	});

	it("returns 401 without a session", async () => {
		const ruleId = createdRuleIds[0];
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}`),
		);
		expect(response.status).toBe(401);
	});
});

describe("GET /alert-rules/:ruleId/events", () => {
	it("returns an empty list for a rule with no fired events yet", async () => {
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}/events`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.alertEvents).toHaveLength(0);
	});

	it("lists fired events for a rule, newest first", async () => {
		const ruleId = createdRuleIds[0];
		if (!ruleId) throw new Error("expected a rule from an earlier test");

		await db.insert(alertEvents).values([
			{ alertRuleId: ruleId, fingerprint: "fp_older" },
			{ alertRuleId: ruleId, fingerprint: "fp_newer" },
		]);

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}/events`, {
				headers: { Cookie: principal.cookie },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.alertEvents).toHaveLength(2);
		// Both rows insert at effectively "now" via defaultNow() — the
		// meaningful assertion is that both fingerprints round-trip
		// correctly, ordering-by-insertion-order isn't guaranteed at
		// millisecond resolution.
		const fingerprints = body.alertEvents.map(
			(e: { fingerprint: string }) => e.fingerprint,
		);
		expect(fingerprints.sort()).toEqual(["fp_newer", "fp_older"]);
	});

	it("returns 401 without a session", async () => {
		const ruleId = createdRuleIds[0];
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}/events`),
		);
		expect(response.status).toBe(401);
	});
});
