import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
	listEnabledErrorSpikeRules,
	listEnabledNewIssueRules,
	listEnabledPerformanceRegressionRules,
} from "./alertRules";
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

describe("listEnabledErrorSpikeRules", () => {
	it("returns only enabled error_spike rules with their threshold/window", async () => {
		const [project] = await db
			.insert(projects)
			.values({ publicKey: `fw_pk_error_spike_db_test_${Date.now()}` })
			.returning();
		if (!project) throw new Error("failed to seed test project");

		const [rule] = await db
			.insert(alertRules)
			.values({
				projectId: project.id,
				type: "error_spike",
				webhookUrl: "https://example.com/hooks/spike",
				windowMinutes: 10,
				thresholdCount: 25,
			})
			.returning();
		if (!rule) throw new Error("failed to seed test rule");

		const [otherTypeRule] = await db
			.insert(alertRules)
			.values({
				projectId: project.id,
				type: "new_issue",
				webhookUrl: "https://example.com/hooks/not-a-spike",
			})
			.returning();
		if (!otherTypeRule) throw new Error("failed to seed test rule");

		try {
			const rules = await listEnabledErrorSpikeRules();
			const found = rules.find((r) => r.id === rule.id);

			expect(found).toBeDefined();
			expect(found?.windowMinutes).toBe(10);
			expect(found?.thresholdCount).toBe(25);
			expect(rules.some((r) => r.id === otherTypeRule.id)).toBe(false);
		} finally {
			await db.delete(alertRules).where(eq(alertRules.id, rule.id));
			await db.delete(alertRules).where(eq(alertRules.id, otherTypeRule.id));
			await db.delete(projects).where(eq(projects.id, project.id));
		}
	});
});

describe("listEnabledPerformanceRegressionRules", () => {
	it("returns only enabled performance_regression rules with their metric/threshold/window", async () => {
		const [project] = await db
			.insert(projects)
			.values({ publicKey: `fw_pk_perf_regression_db_test_${Date.now()}` })
			.returning();
		if (!project) throw new Error("failed to seed test project");

		const [rule] = await db
			.insert(alertRules)
			.values({
				projectId: project.id,
				type: "performance_regression",
				webhookUrl: "https://example.com/hooks/regression",
				windowMinutes: 15,
				metricName: "LCP",
				thresholdValue: 2500,
			})
			.returning();
		if (!rule) throw new Error("failed to seed test rule");

		try {
			const rules = await listEnabledPerformanceRegressionRules();
			const found = rules.find((r) => r.id === rule.id);

			expect(found).toBeDefined();
			expect(found?.windowMinutes).toBe(15);
			expect(found?.metricName).toBe("LCP");
			expect(found?.thresholdValue).toBe(2500);
		} finally {
			await db.delete(alertRules).where(eq(alertRules.id, rule.id));
			await db.delete(projects).where(eq(projects.id, project.id));
		}
	});
});
