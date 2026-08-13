# ADR-022 — Go Ingestion Reads Postgres Directly (Read-Only)

## Status
Accepted

## Decision
Go ingestion (`cmd/ingestion`) gets its own read-only PostgreSQL connection (via `pgx`) to validate a project's `public_key` directly against the `projects` table Bun/Drizzle owns and migrates. Not a call to a Bun-owned internal endpoint, not a cache/replica — at least not yet.

## Context
`docs/06-engineering-specs/data-plane/code-structure.md` explicitly flagged this as unresolved: *"exactly how ingestion validates a project credential — a direct read against Postgres, a replicated/cached copy, or a call to the control plane — isn't decided anywhere in these docs yet."* This ADR resolves it.

## Rationale
Three options were considered:
1. **Direct read-only Postgres access (chosen)** — simplest, no extra network hop, and keeps ingestion's availability/latency independent of Bun being up — consistent with ADR-004's requirement that ingestion not become latency-dependent on downstream systems. Cost: two languages now have their own model of one table (Go's is a narrow, read-only, single-query mirror — not a general ORM layer).
2. **Call a Bun-owned internal endpoint** — keeps Bun as sole gatekeeper, but makes every ingestion request synchronously dependent on Bun's availability and latency, which is a real coupling on telemetry's hot path.
3. **Cached/replicated copy in Go** — fastest at request time, but real complexity (staleness, invalidation, revoked-key windows) not justified before the simpler options are proven insufficient.

## Consequence
Go's Postgres access is narrow and query-oriented, not a generic repository — one interface, `ProjectCredentialRepository` (or similar), exposing exactly what ingestion needs (`FindActiveByPublicKey`), matching `services.md`'s existing rule against pretending a store is generic CRUD. Bun/Drizzle remains the sole owner of writes and migrations to `projects` — Go never writes to control-plane tables. Revisit if/when revocation needs to propagate faster than a direct read allows, or if connection-pool contention between two services on one Postgres becomes a real operational problem.
