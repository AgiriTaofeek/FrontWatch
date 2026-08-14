import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/client";
import { alertRules } from "../db/schema";

// No auth/RBAC yet, same scope note as projects.ts/issues.ts
// (PROGRESS.md Step 2) — deferred to Step 9, not an oversight.
//
// US-13.01: "an authorized user can create a rule, the rule has a
// condition and notification destination, invalid rules cannot be
// saved, rules can be enabled or disabled." Only `type: "new_issue"`
// exists yet (Step 8's first Alerting slice) — error_spike/
// performance_regression need real threshold/window config this
// route doesn't have a shape for yet, deferred to their own chunks.
export const alertRulesRoutes = new Elysia()
	.post(
		"/projects/:projectId/alert-rules",
		async ({ params, body }) => {
			const [rule] = await db
				.insert(alertRules)
				.values({
					projectId: params.projectId,
					webhookUrl: body.webhookUrl,
				})
				.returning();

			return rule;
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			body: t.Object({
				// "invalid rules cannot be saved" — format: "uri" rejects a
				// malformed webhook destination before it ever reaches the
				// alert-worker, which would otherwise only discover a bad
				// URL the moment it tries (and fails) to deliver a real
				// notification.
				webhookUrl: t.String({ format: "uri" }),
			}),
		},
	)
	.get(
		"/projects/:projectId/alert-rules",
		async ({ params }) => {
			const rows = await db
				.select()
				.from(alertRules)
				.where(eq(alertRules.projectId, params.projectId))
				.orderBy(desc(alertRules.createdAt));

			return { alertRules: rows };
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
		},
	)
	.patch(
		"/projects/:projectId/alert-rules/:ruleId",
		async ({ params, body, status }) => {
			const [rule] = await db
				.update(alertRules)
				.set({ enabled: body.enabled, updatedAt: new Date() })
				.where(
					and(
						eq(alertRules.id, params.ruleId),
						eq(alertRules.projectId, params.projectId),
					),
				)
				.returning();

			if (!rule) {
				return status(404, { error: "alert rule not found" });
			}

			return rule;
		},
		{
			params: t.Object({
				projectId: t.String({ format: "uuid" }),
				ruleId: t.String({ format: "uuid" }),
			}),
			body: t.Object({ enabled: t.Boolean() }),
		},
	);
