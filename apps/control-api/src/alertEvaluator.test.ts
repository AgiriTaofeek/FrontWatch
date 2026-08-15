import { afterAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { runAlertEvaluationCycle } from "./alertEvaluator";
import { clickhouse, toClickHouseDateTime64 } from "./db/clickhouse";
import { db } from "./db/client";
import { alertEvents, alertRules, organizations, projects } from "./db/schema";
import { seedTestOrganization } from "./testHelpers/auth";

// Full-cycle integration test — real Postgres (rule + dedup rows),
// real ClickHouse (the issue the rule should detect), and a real
// local HTTP server standing in for the webhook destination. This is
// the one test that actually proves the whole Step 8 slice works
// together, not just each piece in isolation.

let projectId: string;
let ruleId: string;
let organizationId: string;
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
	await db.delete(organizations).where(eq(organizations.id, organizationId));
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
			const organization = await seedTestOrganization();
			organizationId = organization.id;

			const [project] = await db
				.insert(projects)
				.values({
					organizationId,
					publicKey: `fw_pk_alert_evaluator_test_${Date.now()}`,
				})
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

	it("fires an error_spike alert once threshold is met, and doesn't re-fire within the same window bucket (US-13.02)", async () => {
		const receivedPayloads: unknown[] = [];
		const server = Bun.serve({
			port: 0,
			fetch: async (req) => {
				receivedPayloads.push(await req.json());
				return new Response(null, { status: 200 });
			},
		});

		const eventIds: string[] = [];
		let spikeProjectId: string | undefined;
		let spikeRuleId: string | undefined;
		let spikeOrganizationId: string | undefined;

		try {
			const organization = await seedTestOrganization();
			spikeOrganizationId = organization.id;

			const [project] = await db
				.insert(projects)
				.values({
					organizationId: organization.id,
					publicKey: `fw_pk_error_spike_evaluator_${Date.now()}`,
				})
				.returning();
			if (!project) throw new Error("failed to seed test project");
			spikeProjectId = project.id;

			const [rule] = await db
				.insert(alertRules)
				.values({
					projectId: project.id,
					type: "error_spike",
					webhookUrl: `http://localhost:${server.port}/`,
					windowMinutes: 5,
					thresholdCount: 2,
				})
				.returning();
			if (!rule) throw new Error("failed to seed test rule");
			spikeRuleId = rule.id;

			const now = new Date();
			for (let i = 0; i < 2; i++) {
				const eventId = `evt_error_spike_${i}_${Date.now()}`;
				eventIds.push(eventId);
				await clickhouse.insert({
					table: "events",
					values: [
						{
							event_id: eventId,
							project_id: project.id,
							event_type: "error",
							schema_version: 1,
							client_timestamp: toClickHouseDateTime64(now),
							server_received_at: toClickHouseDateTime64(now),
							release: "",
							session_id: "",
							route: "",
							fingerprint: `spike_fp_${i}`,
							fingerprint_version: 1,
							payload: JSON.stringify({
								message: `Spike failure ${i}`,
								exception_type: "SpikeError",
								handled: false,
							}),
						},
					],
					format: "JSONEachRow",
				});
			}

			// Same `now` passed explicitly both cycles — otherwise a real
			// clock tick between calls could cross a window bucket boundary
			// and make the dedup assertion below flaky.
			const firstCycle = await runAlertEvaluationCycle(now);
			expect(firstCycle.errorSpikesNotified).toBe(1);
			expect(receivedPayloads).toHaveLength(1);

			const payload = receivedPayloads[0] as {
				type: string;
				projectId: string;
				errorCount: number;
				thresholdCount: number;
			};
			expect(payload.type).toBe("error_spike");
			expect(payload.projectId).toBe(project.id);
			expect(payload.errorCount).toBeGreaterThanOrEqual(2);
			expect(payload.thresholdCount).toBe(2);

			const secondCycle = await runAlertEvaluationCycle(now);
			expect(secondCycle.errorSpikesNotified).toBe(0);
			expect(receivedPayloads).toHaveLength(1);
		} finally {
			server.stop(true);
			if (eventIds.length > 0) {
				await clickhouse.command({
					query: `ALTER TABLE events DELETE WHERE event_id IN (${eventIds.map((id) => `'${id}'`).join(",")})`,
				});
			}
			if (spikeRuleId) {
				await db
					.delete(alertEvents)
					.where(eq(alertEvents.alertRuleId, spikeRuleId));
				await db.delete(alertRules).where(eq(alertRules.id, spikeRuleId));
			}
			if (spikeProjectId) {
				await db.delete(projects).where(eq(projects.id, spikeProjectId));
			}
			if (spikeOrganizationId) {
				await db
					.delete(organizations)
					.where(eq(organizations.id, spikeOrganizationId));
			}
		}
	});

	it("fires a performance_regression alert once the p75 threshold is exceeded, with route/release context (US-13.03)", async () => {
		const receivedPayloads: unknown[] = [];
		const server = Bun.serve({
			port: 0,
			fetch: async (req) => {
				receivedPayloads.push(await req.json());
				return new Response(null, { status: 200 });
			},
		});

		const eventIds: string[] = [];
		let regressionProjectId: string | undefined;
		let regressionRuleId: string | undefined;
		let regressionOrganizationId: string | undefined;

		try {
			const organization = await seedTestOrganization();
			regressionOrganizationId = organization.id;

			const [project] = await db
				.insert(projects)
				.values({
					organizationId: organization.id,
					publicKey: `fw_pk_performance_regression_evaluator_${Date.now()}`,
				})
				.returning();
			if (!project) throw new Error("failed to seed test project");
			regressionProjectId = project.id;

			const [rule] = await db
				.insert(alertRules)
				.values({
					projectId: project.id,
					type: "performance_regression",
					webhookUrl: `http://localhost:${server.port}/`,
					windowMinutes: 5,
					metricName: "LCP",
					thresholdValue: 1000,
				})
				.returning();
			if (!rule) throw new Error("failed to seed test rule");
			regressionRuleId = rule.id;

			const now = new Date();
			const eventId = `evt_perf_regression_${Date.now()}`;
			eventIds.push(eventId);
			await clickhouse.insert({
				table: "events",
				values: [
					{
						event_id: eventId,
						project_id: project.id,
						event_type: "performance",
						schema_version: 1,
						client_timestamp: toClickHouseDateTime64(now),
						server_received_at: toClickHouseDateTime64(now),
						release: "3.1.0",
						session_id: "",
						route: "/dashboard",
						fingerprint: "",
						fingerprint_version: 0,
						payload: JSON.stringify({
							metric_name: "LCP",
							value: 4200,
							rating: "poor",
							navigation_type: "navigate",
						}),
					},
				],
				format: "JSONEachRow",
			});

			const firstCycle = await runAlertEvaluationCycle(now);
			expect(firstCycle.performanceRegressionsNotified).toBe(1);
			expect(receivedPayloads).toHaveLength(1);

			const payload = receivedPayloads[0] as {
				type: string;
				projectId: string;
				metricName: string;
				p75Value: number;
				thresholdValue: number;
				latestRelease: string | null;
				latestRoute: string | null;
			};
			expect(payload.type).toBe("performance_regression");
			expect(payload.projectId).toBe(project.id);
			expect(payload.metricName).toBe("LCP");
			expect(payload.p75Value).toBeGreaterThanOrEqual(1000);
			expect(payload.thresholdValue).toBe(1000);
			expect(payload.latestRelease).toBe("3.1.0");
			expect(payload.latestRoute).toBe("/dashboard");

			const secondCycle = await runAlertEvaluationCycle(now);
			expect(secondCycle.performanceRegressionsNotified).toBe(0);
			expect(receivedPayloads).toHaveLength(1);
		} finally {
			server.stop(true);
			if (eventIds.length > 0) {
				await clickhouse.command({
					query: `ALTER TABLE events DELETE WHERE event_id IN (${eventIds.map((id) => `'${id}'`).join(",")})`,
				});
			}
			if (regressionRuleId) {
				await db
					.delete(alertEvents)
					.where(eq(alertEvents.alertRuleId, regressionRuleId));
				await db.delete(alertRules).where(eq(alertRules.id, regressionRuleId));
			}
			if (regressionProjectId) {
				await db.delete(projects).where(eq(projects.id, regressionProjectId));
			}
			if (regressionOrganizationId) {
				await db
					.delete(organizations)
					.where(eq(organizations.id, regressionOrganizationId));
			}
		}
	});
});
