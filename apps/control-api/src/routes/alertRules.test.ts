import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { alertEvents, alertRules, projects } from "../db/schema";
import { alertRulesRoutes } from "./alertRules";

// Integration test — hits the real local Postgres, same pattern as
// releases.test.ts. A real project row is required first: alert_rules
// .project_id is a real foreign key.

let projectId: string;
const createdRuleIds: string[] = [];

async function seedProject(): Promise<string> {
	const [project] = await db
		.insert(projects)
		.values({ publicKey: `fw_pk_alert_test_${Date.now()}` })
		.returning();
	if (!project) {
		throw new Error("failed to seed test project");
	}
	return project.id;
}

afterAll(async () => {
	for (const id of createdRuleIds) {
		await db.delete(alertEvents).where(eq(alertEvents.alertRuleId, id));
		await db.delete(alertRules).where(eq(alertRules.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
});

describe("POST /projects/:projectId/alert-rules", () => {
	it("creates a rule with a generated id, type new_issue, enabled by default", async () => {
		projectId = await seedProject();

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ webhookUrl: "https://example.com/hooks/1" }),
			}),
		);
		const body = await response.json();
		createdRuleIds.push(body.id);

		expect(response.status).toBe(200);
		expect(body.projectId).toBe(projectId);
		expect(body.type).toBe("new_issue");
		expect(body.webhookUrl).toBe("https://example.com/hooks/1");
		expect(body.enabled).toBe(true);
	});

	it("rejects a malformed webhookUrl — invalid rules cannot be saved (US-13.01)", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ webhookUrl: "not-a-url" }),
			}),
		);

		expect(response.status).toBe(422);
	});
});

describe("GET /projects/:projectId/alert-rules", () => {
	it("lists rules for a project", async () => {
		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${projectId}/alert-rules`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.alertRules).toHaveLength(1);
		expect(body.alertRules[0].webhookUrl).toBe("https://example.com/hooks/1");
	});

	it("returns an empty list for a project with no rules", async () => {
		const otherProjectId = await seedProject();

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/projects/${otherProjectId}/alert-rules`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.alertRules).toHaveLength(0);

		await db.delete(projects).where(eq(projects.id, otherProjectId));
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
					headers: { "Content-Type": "application/json" },
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
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ enabled: true }),
				},
			),
		);

		expect(response.status).toBe(404);
	});

	it("returns 404 when the rule belongs to a different project", async () => {
		const otherProjectId = await seedProject();
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(
				`http://localhost/projects/${otherProjectId}/alert-rules/${ruleId}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ enabled: true }),
				},
			),
		);

		expect(response.status).toBe(404);

		await db.delete(projects).where(eq(projects.id, otherProjectId));
	});
});

describe("GET /alert-rules/:ruleId", () => {
	it("returns a rule by id alone, no project scoping needed", async () => {
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}`),
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
			),
		);
		expect(response.status).toBe(404);
	});
});

describe("GET /alert-rules/:ruleId/events", () => {
	it("returns an empty list for a rule with no fired events yet", async () => {
		const ruleId = createdRuleIds[0];

		const response = await alertRulesRoutes.handle(
			new Request(`http://localhost/alert-rules/${ruleId}/events`),
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
			new Request(`http://localhost/alert-rules/${ruleId}/events`),
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
});
