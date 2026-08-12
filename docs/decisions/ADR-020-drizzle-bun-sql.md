# ADR-020 — Drizzle ORM (bun-sql driver) for the Control Plane

## Status
Accepted

## Decision
Use Drizzle ORM, via its native `drizzle-orm/bun-sql` driver (built on Bun's own `Bun.sql` client), for all `apps/control-api` access to PostgreSQL. `drizzle-kit` is the migration CLI, run as a dev dependency.

## Rationale
Three real options were considered: a heavier traditional ORM style (Drizzle), a lower-level type-safe query builder (Kysely), and raw SQL with a plain Postgres client. Drizzle wins for this project specifically because: TypeScript-first schema-as-code generates real SQL migrations rather than hiding them; queries stay type-safe end-to-end without a bespoke query-builder layer to learn on top of SQL; and its `bun-sql` driver uses Bun's native Postgres client directly, avoiding an extra dependency (`pg` or `postgres.js`) that a Node-oriented driver would require — consistent with the control plane already being fully committed to the Bun runtime (ADR-017).

## Consequence
`apps/control-api` gets a `drizzle.config.ts`, a schema file (starting with `projects`, per `05-architecture/data-model.md` §1), and migrations generated via `drizzle-kit generate` / applied via `drizzle-kit migrate`. The logical data model in `data-model.md` is unchanged by this decision — this ADR only fixes *how* that model gets expressed as real Postgres schema and queried from TypeScript, not what the model contains.
