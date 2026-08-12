import { sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
