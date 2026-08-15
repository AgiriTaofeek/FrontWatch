import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { seedTestOrganization } from "../testHelpers/auth";
import { markAlertEventNotified, recordAlertEvent } from "./alertEvents";
import { db } from "./client";
import { alertEvents, alertRules, organizations, projects } from "./schema";

// Integration test — hits the real local Postgres. The dedup
// constraint itself lives in schema.ts (unique(alert_rule_id,
// fingerprint)); this test is specifically about
// recordAlertEvent/markAlertEventNotified's own behavior around it.

let projectId: string;
let organizationId: string;
const createdRuleIds: string[] = [];
const createdEventIds: string[] = [];

afterAll(async () => {
	// Order matters — alert_events.alert_rule_id is a real FK
	// (schema.ts), so events must go before the rules they reference.
	for (const id of createdEventIds) {
		await db.delete(alertEvents).where(eq(alertEvents.id, id));
	}
	for (const id of createdRuleIds) {
		await db.delete(alertRules).where(eq(alertRules.id, id));
	}
	if (projectId) {
		await db.delete(projects).where(eq(projects.id, projectId));
	}
	if (organizationId) {
		await db.delete(organizations).where(eq(organizations.id, organizationId));
	}
});

describe("recordAlertEvent / markAlertEventNotified", () => {
	it("inserts a new event and returns its id", async () => {
		const organization = await seedTestOrganization();
		organizationId = organization.id;

		const [project] = await db
			.insert(projects)
			.values({
				organizationId,
				publicKey: `fw_pk_alert_events_test_${Date.now()}`,
			})
			.returning();
		if (!project) throw new Error("failed to seed test project");
		projectId = project.id;

		const [rule] = await db
			.insert(alertRules)
			.values({ projectId, webhookUrl: "https://example.com/hooks/x" })
			.returning();
		if (!rule) throw new Error("failed to seed test rule");
		createdRuleIds.push(rule.id);

		const event = await recordAlertEvent(rule.id, "fp_a");
		expect(event).toBeDefined();
		if (event) createdEventIds.push(event.id);
	});

	it("returns undefined for a duplicate (rule, fingerprint) pair — the dedup gate", async () => {
		const ruleId = createdRuleIds[0];
		if (!ruleId) throw new Error("expected a rule from the previous test");

		const event = await recordAlertEvent(ruleId, "fp_a");
		expect(event).toBeUndefined();
	});

	it("allows the same fingerprint under a different rule", async () => {
		const [otherRule] = await db
			.insert(alertRules)
			.values({ projectId, webhookUrl: "https://example.com/hooks/y" })
			.returning();
		if (!otherRule) throw new Error("failed to seed second test rule");
		createdRuleIds.push(otherRule.id);

		const event = await recordAlertEvent(otherRule.id, "fp_a");
		expect(event).toBeDefined();
		if (event) createdEventIds.push(event.id);
	});

	it("marks an event notified, setting notifiedAt", async () => {
		const ruleId = createdRuleIds[0];
		if (!ruleId) throw new Error("expected a rule from an earlier test");

		const event = await recordAlertEvent(ruleId, "fp_b");
		if (!event) throw new Error("expected a new event");
		createdEventIds.push(event.id);

		await markAlertEventNotified(event.id);

		const [row] = await db
			.select()
			.from(alertEvents)
			.where(eq(alertEvents.id, event.id));

		expect(row?.notifiedAt).not.toBeNull();
	});
});
