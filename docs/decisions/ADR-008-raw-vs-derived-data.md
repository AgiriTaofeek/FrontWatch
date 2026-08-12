# ADR-008 — Keep Raw Telemetry and Derived Data Conceptually Distinct

## Status
Accepted

## Decision
Maintain an explicit conceptual (and where practical, physical) distinction between raw observations (events) and derived entities (issues, health, aggregates, correlations).

## Rationale
Issues, health scores, and aggregates are *interpretations* of raw evidence, computed by a fingerprinting/aggregation algorithm that will itself evolve — they may need to be recomputed as that algorithm improves. If derived data is treated as indistinguishable from raw evidence, recomputation and algorithm changes become destructive instead of additive.

## Consequence
`05-architecture/data-model.md` §1-2 separates raw telemetry entities from derived entities (Issue, IssueOccurrence, Health Snapshot) explicitly. `05-architecture/system-architecture.md` §9 requires the architecture to define which layer is authoritative for raw event evidence vs. derived structures — derived data must never accidentally become the only durable copy of critical evidence.
