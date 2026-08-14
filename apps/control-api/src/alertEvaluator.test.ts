import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { runAlertEvaluationCycle } from "./alertEvaluator";
import { clickhouse, toClickHouseDateTime64 } from "./db/clickhouse";
import { db } from "./db/client";
import { alertEvents, alertRules, projects } from "./db/schema";

// Full-cycle integration test — real Postgres (rule + dedup rows),
// real ClickHouse (the issue the rule should detect), and a real
// local HTTP server standing in for the webhook destination. This is
// the one test that actually proves the whole Step 8 slice works
// together, not just each piece in isolation.

let projectId: string;
let ruleId: string;
const insertedEventIds: string[] = [];

afterAll(async () => {
	if (insertedEventIds.length > 0) {
		await clickhouse.command({
			query: `ALTER TABLE events DELETE WHERE event_id IN (${insertedEventIds.map((id) => `'${id}'`).join(",")})`,
		});
	}
	await db.delete(alertEvents).where(eq(alertEvents.alertRuleId, ruleId));
	await db.delete(alertRules).where(eq(alertRules.id, ruleId));
	await db.delete(projects).where(eq(projects.id, projectId));
});

describe("runAlertEvaluationCycle", () => {
	it("detects a genuinely new issue, delivers a webhook, and never re-notifies on the next cycle", async () => {
		const receivedPayloads: unknown[] = [];
		const server = Bun.serve({
			port: 0,
			fetch: async (req) => {
				receivedPayloads.push(await req.json());
				return new Response(null, { status: 200 });
			},
		});

		try {
			const [project] = await db
				.insert(projects)
				.values({ publicKey: `fw_pk_alert_evaluator_test_${Date.now()}` })
				.returning();
			if (!project) throw new Error("failed to seed test project");
			projectId = project.id;

			const [rule] = await db
				.insert(alertRules)
				.values({
					projectId,
					webhookUrl: `http://localhost:${server.port}/`,
				})
				.returning();
			if (!rule) throw new Error("failed to seed test rule");
			ruleId = rule.id;

			const fingerprint = `evaluator_fp_${Date.now()}`;
			const eventId = `evt_evaluator_${Date.now()}`;
			insertedEventIds.push(eventId);
			await clickhouse.insert({
				table: "events",
				values: [
					{
						event_id: eventId,
						project_id: projectId,
						event_type: "error",
						schema_version: 1,
						// After the rule's own createdAt — the "genuinely new"
						// condition runAlertEvaluationCycle actually checks.
						client_timestamp: toClickHouseDateTime64(new Date()),
						server_received_at: toClickHouseDateTime64(new Date()),
						release: "",
						session_id: "",
						route: "",
						fingerprint,
						fingerprint_version: 1,
						payload: JSON.stringify({
							message: "Evaluator test failure",
							exception_type: "EvaluatorTestError",
							handled: false,
						}),
					},
				],
				format: "JSONEachRow",
			});

			const firstCycle = await runAlertEvaluationCycle();
			expect(firstCycle.issuesNotified).toBeGreaterThanOrEqual(1);
			expect(receivedPayloads).toHaveLength(1);

			const payload = receivedPayloads[0] as {
				type: string;
				projectId: string;
				issue: { fingerprint: string; title: string };
			};
			expect(payload.type).toBe("new_issue");
			expect(payload.projectId).toBe(projectId);
			expect(payload.issue.fingerprint).toBe(fingerprint);
			expect(payload.issue.title).toBe("Evaluator test failure");

			// alert_events actually recorded this as notified, not just
			// "attempted" — db/alertEvents.ts's markAlertEventNotified path.
			const [eventRow] = await db
				.select()
				.from(alertEvents)
				.where(eq(alertEvents.alertRuleId, ruleId));
			expect(eventRow?.fingerprint).toBe(fingerprint);
			expect(eventRow?.notifiedAt).not.toBeNull();

			// The second cycle must not re-notify — the dedup constraint
			// (alert_events' unique(alert_rule_id, fingerprint)) is the
			// whole point of US-13.02.
			const secondCycle = await runAlertEvaluationCycle();
			expect(secondCycle.issuesNotified).toBe(0);
			expect(receivedPayloads).toHaveLength(1);
		} finally {
			server.stop(true);
		}
	});
});
