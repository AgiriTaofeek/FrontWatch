import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { listAlertEvents } from "../db/alertEvents";
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
	)
	// Flat, not nested under /projects/:projectId — ruleId (a real
	// Postgres uuid) already uniquely identifies a rule on its own, and
	// the dashboard's detail page doesn't necessarily know the
	// project id ahead of time. Same "flat route" lesson Release's
	// detail page already had to learn the hard way (PROGRESS.md Step
	// 7): a route nested under an existing list route's path becomes
	// that route's layout child in TanStack Router's file-based
	// routing, silently requiring an <Outlet /> the list page doesn't
	// have.
	.get(
		"/alert-rules/:ruleId",
		async ({ params, status }) => {
			const [rule] = await db
				.select()
				.from(alertRules)
				.where(eq(alertRules.id, params.ruleId));

			if (!rule) {
				return status(404, { error: "alert rule not found" });
			}

			return rule;
		},
		{
			params: t.Object({ ruleId: t.String({ format: "uuid" }) }),
		},
	)
	.get(
		"/alert-rules/:ruleId/events",
		async ({ params }) => {
			const events = await listAlertEvents(params.ruleId);
			return { alertEvents: events };
		},
		{
			params: t.Object({ ruleId: t.String({ format: "uuid" }) }),
		},
	);
