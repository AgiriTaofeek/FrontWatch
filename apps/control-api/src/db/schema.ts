import { sql } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

// ADR-021: UUID primary keys everywhere in the control plane — project_id
// specifically ends up in every telemetry event the SDK sends, so a
// sequential integer here would leak business metrics and make cross-tenant
// enumeration attempts trivial.
//
// application_id / environment_id are nullable for now: the real model
// (docs/05-architecture/data-model.md §1) has Project depend on Application
// and Environment, but those tables don't exist yet (PROGRESS.md Step 2 —
// deliberately deferred, not an oversight). No .references() until they do.

export const projectStatus = pgEnum("project_status", ["active", "disabled"]);

export const projects = pgTable("projects", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	applicationId: uuid("application_id"),
	environmentId: uuid("environment_id"),

	// The SDK/telemetry identity boundary (data-model.md §1). Not a secret in
	// the confidentiality sense — it ships inside client-side JS by design,
	// same threat model as a Sentry DSN. Generated server-side, never
	// client-suppliable. Must stay unique: every ingestion request looks a
	// project up by this value, so this is the hottest read path this table
	// will ever have.
	publicKey: text("public_key").notNull().unique(),

	status: projectStatus("status").notNull().default("active"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// data-model.md §1 has Release depend on Application, and a separate
// Deployment entity (Release + Environment + Time) for the case where
// one release rolls out to multiple environments. Neither distinction
// exists here yet — same deviation `projects` itself already made
// (Application/Environment aren't real tables), tracked in
// PROGRESS.md's deviations log, not silent. Release and Deployment are
// deliberately collapsed into one project-scoped row: `deployedAt` is
// Deployment's own field, folded in directly, since one project
// currently stands in for "one environment" the same way it already
// does for issues/network/sessions/performance's project-scoped
// endpoints.
//
// `version` matches the free-text string the SDK already sends on
// every event today (Step 4's SdkConfig.release, stored as
// ClickHouse's `release` column) — this table doesn't introduce a new
// release identifier telemetry has to adopt, it gives the string
// that's already flowing through the pipeline a real deployment record
// to correlate against.
export const releases = pgTable(
	"releases",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id),

		version: text("version").notNull(),
		commitSha: text("commit_sha"),

		deployedAt: timestamp("deployed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		// A project deploying the same version string twice is almost
		// certainly a mistake (a re-run CI job, a copy-pasted request) —
		// rejecting it outright is more useful than silently duplicating
		// release-health rows for what release-investigation.md's
		// comparison view would otherwise show as two separate releases.
		unique().on(table.projectId, table.version),
	],
);

// Step 8's Alerting slice (E13-alerts.md US-13.01/13.02/13.03): all
// three documented alert types now real. type is still a real enum
// (not a bare string) — widened once, the same way EventType/
// WireEventType already did in Step 7.
export const alertRuleType = pgEnum("alert_rule_type", [
	"new_issue",
	"error_spike",
	"performance_regression",
]);

// The five Core Web Vitals instrumentation.md names — same set
// packages/sdk/src/performance.ts already captures, so a
// performance_regression rule can only ever target a metric that's
// actually collected.
export const alertMetricName = pgEnum("alert_metric_name", [
	"CLS",
	"FCP",
	"INP",
	"LCP",
	"TTFB",
]);

// alert-investigation.md's own documented state machine (Triggered ->
// Acknowledged -> Recovered -> Resolved) — the full enum is defined
// now since Postgres enum widening is real migration friction, but
// this slice's alert-worker only ever writes "triggered". The other
// three states (and the transitions between them) are deferred to a
// follow-up chunk, same "schema now, behavior later" reasoning
// releases.deployedAt already used for Deployment.
export const alertEventState = pgEnum("alert_event_state", [
	"triggered",
	"acknowledged",
	"recovered",
	"resolved",
]);

// US-13.01: "an authorized user can create a rule, the rule has a
// condition and notification destination, rules can be enabled or
// disabled." webhookUrl is the notification destination — the
// simplest real delivery mechanism (no external service credentials
// needed; Slack/email can consume a webhook later, same reasoning a
// Sentry/PagerDuty-style tool would use for a first alerting slice).
export const alertRules = pgTable("alert_rules", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	projectId: uuid("project_id")
		.notNull()
		.references(() => projects.id),

	type: alertRuleType("type").notNull().default("new_issue"),
	webhookUrl: text("webhook_url").notNull(),
	enabled: boolean("enabled").notNull().default(true),

	// Condition config — nullable, only the columns matching `type` are
	// ever populated (routes/alertRules.ts's discriminated-union body
	// schema enforces exactly which, so this table can never end up with
	// a half-populated condition for a given type). Flat nullable
	// columns rather than a JSON blob: every other Postgres table in
	// this schema is flat (raw JSON is ADR-008's ClickHouse-side
	// pattern, deliberately not used here), and three sparse columns is
	// small enough that a JSON condition column would just be
	// indirection without a real benefit.
	//
	// error_spike (US-13.02): windowMinutes + thresholdCount — "N+
	// errors within the last M minutes".
	// performance_regression (US-13.03): windowMinutes + metricName +
	// thresholdValue — "metric's p75 over the last M minutes exceeds
	// this value".
	windowMinutes: integer("window_minutes"),
	thresholdCount: integer("threshold_count"),
	metricName: alertMetricName("metric_name"),
	thresholdValue: doublePrecision("threshold_value"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// One row per (rule, issue) firing — the alert-worker's own dedup
// record (US-13.02: "repeated evaluations do not create uncontrolled
// duplicate notifications"). fingerprint is the issue's stable
// grouping key (Step 5's issue.Fingerprint), not a foreign key into
// any Postgres table — issues are derived by ClickHouse GROUP BY
// (ADR-023), there's no `issues` row to reference.
export const alertEvents = pgTable(
	"alert_events",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

		alertRuleId: uuid("alert_rule_id")
			.notNull()
			.references(() => alertRules.id),

		fingerprint: text("fingerprint").notNull(),
		state: alertEventState("state").notNull().default("triggered"),

		triggeredAt: timestamp("triggered_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		// Null until the webhook POST actually succeeds — a failed
		// delivery still gets recorded (so the dedup constraint below
		// still prevents re-triggering on every poll), but stays
		// distinguishable from a real, delivered notification.
		notifiedAt: timestamp("notified_at", { withTimezone: true }),
	},
	(table) => [
		// The actual dedup mechanism: the alert-worker's poll loop relies
		// on this constraint (via onConflictDoNothing, same pattern
		// releases' own duplicate-version handling already uses) to make
		// "have we already alerted on this issue for this rule" an atomic
		// database guarantee, not a check-then-insert race.
		unique().on(table.alertRuleId, table.fingerprint),
	],
);
