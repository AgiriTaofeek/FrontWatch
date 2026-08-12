# ADR-021 — UUID Primary Keys for Control-Plane Entities

## Status
Accepted

## Decision
Use UUID (v4, via PostgreSQL's native `gen_random_uuid()`) as the primary key type for all control-plane (PostgreSQL) tables, starting with `projects`. Not sequential integers.

## Rationale
Control-plane identifiers are not purely internal — `project_id` specifically is a literal field in the telemetry event envelope every browser SDK sends (`06-engineering-specs/README.md` §Event contracts), meaning it is visible in any customer's network traffic/devtools by design. A sequential integer would leak business metrics (project count, growth rate) publicly and make cross-tenant enumeration attempts trivial — a meaningful concern given how seriously this project treats tenant isolation (`05-architecture/security-architecture.md`, the dedicated isolation suite in `07-delivery/test-strategy.md`). UUIDs remove that exposure.

v4 over v7: v7's advantage (B-tree index locality under high insert rates) doesn't apply here — the control plane is explicitly CRUD-shaped, low/bursty traffic (`tech-stack.md`), not a high-volume insert path (that's ClickHouse's job, unaffected by this decision). v4 via `gen_random_uuid()` has been native to PostgreSQL since v13 — zero extra dependencies, versus v7 requiring an app-side generation library since PostgreSQL 16 (what this project is pinned to) has no native `uuidv7()`.

## Consequence
Every control-plane table's `id` column is `uuid primary key default gen_random_uuid()`. Foreign keys referencing these tables are `uuid`, not `integer`/`bigint`. Revisit only if a specific table's insert volume genuinely grows into a regime where v7's index-locality benefit outweighs the added dependency — not preemptively.
