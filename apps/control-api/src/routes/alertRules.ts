import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { listAlertEvents } from "../db/alertEvents";
import { db } from "../db/client";
import { alertRules } from "../db/schema";
import { authorizeProjectAccess } from "../lib/authorization";
import { authPlugin } from "../lib/authPlugin";

// Step 9's RBAC-enforcement slice: "engineer" or higher to create/
// update a rule (a real write with operational consequences — it
// controls who gets paged), "viewer" (any active member) to read.
//
// US-13.01: "an authorized user can create a rule, the rule has a
// condition and notification destination, invalid rules cannot be
// saved, rules can be enabled or disabled." All three E13-alerts.md
// alert types are real now (US-13.01/13.02/13.03) — `type` is a
// discriminated union in the request body, not a flat object with
// optional fields, so "invalid rules cannot be saved" also covers
// "an error_spike rule submitted without a threshold" the same way it
// already covers a malformed webhook URL: rejected before it ever
// reaches the database, not just before the evaluator ever runs.
const newIssueBody = t.Object({
	type: t.Literal("new_issue"),
	webhookUrl: t.String({ format: "uri" }),
});

// US-13.02: "a configured threshold can trigger an alert" — N+ errors
// within the last M minutes, evaluated project-wide (alertEvaluator.ts).
const errorSpikeBody = t.Object({
	type: t.Literal("error_spike"),
	webhookUrl: t.String({ format: "uri" }),
	windowMinutes: t.Integer({ minimum: 1 }),
	thresholdCount: t.Integer({ minimum: 1 }),
});

// US-13.03: "performance metrics can be used as conditions, threshold/
// window configuration is supported" — one of the five Core Web Vitals
// instrumentation.md names, p75 over the window vs. thresholdValue.
const performanceRegressionBody = t.Object({
	type: t.Literal("performance_regression"),
	webhookUrl: t.String({ format: "uri" }),
	windowMinutes: t.Integer({ minimum: 1 }),
	metricName: t.Union([
		t.Literal("CLS"),
		t.Literal("FCP"),
		t.Literal("INP"),
		t.Literal("LCP"),
		t.Literal("TTFB"),
	]),
	thresholdValue: t.Number({ minimum: 0 }),
});

const createAlertRuleBody = t.Union([
	newIssueBody,
	errorSpikeBody,
	performanceRegressionBody,
]);

export const alertRulesRoutes = new Elysia()
	.use(authPlugin())
	.post(
		"/projects/:projectId/alert-rules",
		async ({ params, body, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"engineer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const [rule] = await db
				.insert(alertRules)
				.values({
					projectId: params.projectId,
					type: body.type,
					webhookUrl: body.webhookUrl,
					// Only the columns matching body.type are ever populated —
					// the discriminated union above guarantees TypeScript (and
					// the request validator, before this code even runs) never
					// lets e.g. a new_issue body carry a windowMinutes.
					...(body.type === "error_spike"
						? {
								windowMinutes: body.windowMinutes,
								thresholdCount: body.thresholdCount,
							}
						: {}),
					...(body.type === "performance_regression"
						? {
								windowMinutes: body.windowMinutes,
								metricName: body.metricName,
								thresholdValue: body.thresholdValue,
							}
						: {}),
				})
				.returning();

			return rule;
		},
		{
			params: t.Object({ projectId: t.String({ format: "uuid" }) }),
			body: createAlertRuleBody,
		},
	)
	.get(
		"/projects/:projectId/alert-rules",
		async ({ params, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

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
		async ({ params, body, principal, status }) => {
			const auth = await authorizeProjectAccess(
				principal,
				params.projectId,
				"engineer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

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
	//
	// No projectId in the URL to authorize against directly — these two
	// routes look the rule up first (to learn its projectId), then
	// authorize, then either reuse the row already fetched (GET
	// /alert-rules/:ruleId) or proceed to the events query (GET
	// /alert-rules/:ruleId/events). A rule that doesn't exist and a
	// rule a cross-tenant principal can't see both 404 identically —
	// same reasoning authorizeProjectAccess already applies to project
	// ids.
	.get(
		"/alert-rules/:ruleId",
		async ({ params, principal, status }) => {
			const [rule] = await db
				.select()
				.from(alertRules)
				.where(eq(alertRules.id, params.ruleId));

			if (!rule) {
				return status(404, { error: "alert rule not found" });
			}

			const auth = await authorizeProjectAccess(
				principal,
				rule.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			return rule;
		},
		{
			params: t.Object({ ruleId: t.String({ format: "uuid" }) }),
		},
	)
	.get(
		"/alert-rules/:ruleId/events",
		async ({ params, principal, status }) => {
			const [rule] = await db
				.select()
				.from(alertRules)
				.where(eq(alertRules.id, params.ruleId));

			if (!rule) {
				return status(404, { error: "alert rule not found" });
			}

			const auth = await authorizeProjectAccess(
				principal,
				rule.projectId,
				"viewer",
			);
			if (!auth.ok) {
				return status(auth.status, { error: auth.error });
			}

			const events = await listAlertEvents(params.ruleId);
			return { alertEvents: events };
		},
		{
			params: t.Object({ ruleId: t.String({ format: "uuid" }) }),
		},
	);
