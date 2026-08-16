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
// application_id / environment_id are now real FKs (Post-MVP gap
// closure, PROGRESS.md — the real model in docs/05-architecture/
// data-model.md §1 has Project depend on Application and Environment),
// but deliberately still nullable — scope confirmed with the user
// before building: making them required would be a breaking change
// across every existing project-creation call site (control-api tests,
// loadtest/, chaostest/, apps/demo, the self-hosted install docs), for
// a real customer need ("multiple environments per application") that
// doesn't exist yet pre-pilot. This closes "Application/Environment
// aren't real tables" (Step 2's original deviation) without also
// closing "a project must belong to one" — a deliberately separate,
// larger decision, tracked, not conflated with this one.
//
// organizationId is NOT nullable, unlike those two — Step 9's RBAC-
// enforcement slice needs a real tenant boundary to enforce against,
// and "which organization owns this project" is exactly that
// boundary (security-architecture.md §6). Forward reference to
// `organizations` (defined further down this file, near the rest of
// the auth slice) — Drizzle's `.references(() => ...)` arrow function
// makes definition order in this file irrelevant.

export const projectStatus = pgEnum("project_status", ["active", "disabled"]);

// data-model.md §1: "Application | id, organization_id, name,
// framework, status, created_at, updated_at". framework is free text
// (not an enum) deliberately — mvp.md §5's Tier 1/2/3 framework list is
// still growing (React today, Vue/Svelte/etc. later), and this column
// is descriptive metadata for the dashboard, not something any query
// branches on the way EventType/AlertRuleType do.
export const applicationStatus = pgEnum("application_status", [
	"active",
	"disabled",
]);

export const applications = pgTable("applications", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),

	name: text("name").notNull(),
	framework: text("framework"),
	status: applicationStatus("status").notNull().default("active"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// data-model.md §1: "Environment | id, application_id, name, type,
// status, created_at" — type: development/staging/production/custom,
// its own literal list. No default: unlike alertRuleType's "new_issue"
// (a genuine common-case default), silently defaulting an unspecified
// environment to "production" would be actively dangerous if a caller
// forgot to set it — the API requires an explicit choice instead
// (routes/environments.ts's body schema has no optional here).
export const environmentType = pgEnum("environment_type", [
	"development",
	"staging",
	"production",
	"custom",
]);
export const environmentStatus = pgEnum("environment_status", [
	"active",
	"disabled",
]);

export const environments = pgTable("environments", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	applicationId: uuid("application_id")
		.notNull()
		.references(() => applications.id),

	name: text("name").notNull(),
	type: environmentType("type").notNull(),
	status: environmentStatus("status").notNull().default("active"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const projects = pgTable("projects", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	organizationId: uuid("organization_id")
		.notNull()
		.references(() => organizations.id),

	applicationId: uuid("application_id").references(() => applications.id),
	environmentId: uuid("environment_id").references(() => environments.id),

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

// Step 9's first auth slice (ADR-027: local email+password, OIDC
// deferred). data-model.md §1's Organization/User/Membership model,
// built for real now — project_id has been the only actual tenant
// boundary up to this point (every route's own "no auth/RBAC yet"
// comment), this is what replaces that.
//
// One status enum per entity (not one shared enum), matching
// projectStatus's own precedent — organizations/users/memberships
// each have their own independent lifecycle even though the values
// happen to overlap today.
export const organizationStatus = pgEnum("organization_status", [
	"active",
	"disabled",
]);
export const userStatus = pgEnum("user_status", ["active", "disabled"]);
export const membershipStatus = pgEnum("membership_status", [
	"active",
	"disabled",
]);

// api-contracts.md / auth.md's three roles. A real enum, not a bare
// string, same reasoning alertRuleType/alertEventState already
// established — "future: custom roles" (tech-stack.md) is real later
// work, not something a bare string would make meaningfully easier to
// add anyway (still a migration either way).
export const membershipRole = pgEnum("membership_role", [
	"administrator",
	"engineer",
	"viewer",
]);

export const organizations = pgTable("organizations", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	name: text("name").notNull(),
	status: organizationStatus("status").notNull().default("active"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const users = pgTable("users", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	// ADR-027: Bun.password (argon2id, Bun's own default) — verified
	// directly against a real password round-trip before adopting it,
	// not assumed from docs. Never logged (auth.md's explicit
	// requirement) — nothing in this codebase logs request bodies.
	passwordHash: text("password_hash").notNull(),
	status: userStatus("status").notNull().default("active"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// The join table carrying `role` — data-model.md §1 names this
// exactly. US-01.01: "creating an org makes the creator an
// Administrator" — registration (routes/auth.ts) creates exactly one
// of these, with role "administrator", atomically with the
// organization and user rows.
export const memberships = pgTable(
	"memberships",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),

		role: membershipRole("role").notNull(),
		status: membershipStatus("status").notNull().default("active"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		// data-model.md §1's own constraint: one user can't hold two
		// memberships in the same organization.
		unique().on(table.organizationId, table.userId),
	],
);

// ADR-027: a server-side session, not a stateless JWT — auth.md's
// "revocation" requirement is real and immediate with a row to delete.
// tokenHash, not the raw token: the same reasoning passwordHash is
// hashed, not stored raw — a leaked database shouldn't hand out
// ready-to-use bearer credentials for every logged-in user. SHA-256
// (not argon2) is the right tool here specifically because a session
// token is already high-entropy random, unlike a human-chosen
// password — argon2's deliberate slowness defends against guessing a
// low-entropy secret, which doesn't apply to a 256-bit random value.
export const authSessions = pgTable("auth_sessions", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),

	tokenHash: text("token_hash").notNull().unique(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

	createdAt: timestamp("created_at", { withTimezone: true })
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
