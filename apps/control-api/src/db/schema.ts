import { sql } from "drizzle-orm";
import {
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
