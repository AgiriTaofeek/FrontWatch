# ADR-023 — Issues Are Derived by Query, Not a Materialized Table

## Status
Accepted

## Decision
`Issue` and `IssueOccurrence` have no dedicated ClickHouse table. Issue identity, counts, first/last-seen, and the representative title/message are all computed by aggregating the existing `events` table (`GROUP BY project_id, fingerprint`), not maintained as separately upserted rows.

## Rationale
`E11.01`'s acceptance criteria ("issues have stable identifiers") is satisfiable without a separate table: `fingerprint` (Step 5, deterministic and stable per event) already *is* a stable identifier, scoped by `project_id`. The alternative — a `ReplacingMergeTree`-based upsert table, reading current state, incrementing counts, writing a new version row on every occurrence — is real, avoidable complexity: ClickHouse has no row-level UPDATE, so any "mutable issue" table means fighting the storage engine's actual model rather than using it as designed.

This is close to the ideal case ADR-008 describes: *"aggregates should be recomputable from telemetry where practical."* `count()`, `min/max(client_timestamp)`, and `argMax(payload, client_timestamp)` (latest occurrence's payload as the current title/message) are exactly the aggregation ClickHouse is built to do fast — nothing to keep in sync, nothing that can drift from the raw evidence it's derived from.

## Consequence
Issue resolution state (`E11.03`) is explicitly **not** covered by this ADR and is **not in Step 6's scope** (checked against `PROGRESS.md` and `mvp.md`'s golden scenario — recovery there is *observed* via telemetry stopping, not manually marked). Resolution is a genuine human decision, not derivable from telemetry — if/when it's built, it needs real mutable state, most naturally a small Postgres side table (`project_id, fingerprint, status`), not a ClickHouse concern. Revisit if per-issue query latency at real data volume makes live aggregation impractical — the escape hatch then is a periodically-refreshed materialized view, not hand-rolled upsert logic.
