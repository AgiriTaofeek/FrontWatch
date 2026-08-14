import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { listEnabledNewIssueRules } from "./alertRules";
import { db } from "./client";
import { alertRules, projects } from "./schema";

// Integration test — hits the real local Postgres. Not scoped to a
// single project (unlike most of this codebase's other integration
// tests) since listEnabledNewIssueRules deliberately lists across all
// projects — the alert-evaluator polls every enabled rule in one
// pass, not one project at a time.

let projectId: string;
const createdRuleIds: string[] = [];

afterAll(async () => {
	for (const id of createdRuleIds) {
		await db.delete(alertRules).where(eq(alertRules.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
});

describe("listEnabledNewIssueRules", () => {
	it("only returns enabled new_issue rules, not disabled ones", async () => {
		const [project] = await db
			.insert(projects)
			.values({ publicKey: `fw_pk_alert_rules_db_test_${Date.now()}` })
			.returning();
		if (!project) throw new Error("failed to seed test project");
		projectId = project.id;

		const [enabledRule] = await db
			.insert(alertRules)
			.values({
				projectId,
				webhookUrl: "https://example.com/hooks/enabled",
				enabled: true,
			})
			.returning();
		const [disabledRule] = await db
			.insert(alertRules)
			.values({
				projectId,
				webhookUrl: "https://example.com/hooks/disabled",
				enabled: false,
			})
			.returning();
		if (!enabledRule || !disabledRule) {
			throw new Error("failed to seed test rules");
		}
		createdRuleIds.push(enabledRule.id, disabledRule.id);

		const rules = await listEnabledNewIssueRules();
		const ids = rules.map((r) => r.id);

		expect(ids).toContain(enabledRule.id);
		expect(ids).not.toContain(disabledRule.id);
	});
});
