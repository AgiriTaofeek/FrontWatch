# Architecture Decision Register

This document records architectural decisions and unresolved decisions.

## ADR-001 — Separate Ingestion From Console API

**Decision:** Treat telemetry ingestion and authenticated application APIs as separate architectural concerns.

**Reason:** They have radically different traffic, authentication, scaling, and failure characteristics.

## ADR-002 — SDK Must Be Framework-Neutral

**Decision:** Maintain a framework-neutral core SDK with thin framework adapters.

**Reason:** FrontWatch must support many frontend frameworks without duplicating the telemetry model.

## ADR-003 — Privacy Before Transmission

**Decision:** Perform filtering/redaction in the browser whenever technically possible.

**Reason:** Data should ideally never leave the customer application boundary unnecessarily.

## ADR-004 — Raw Telemetry vs Derived Data

**Decision:** Keep a conceptual distinction between raw observations and derived entities.

**Reason:** Issues, health, and aggregates are interpretations that may need recomputation.

## ADR-005 — Prefer Idempotent Processing

**Decision:** Design event processing to tolerate duplicate delivery.

**Reason:** Distributed systems cannot safely assume perfect delivery.

## ADR-006 — Storage Is Workload-Specific

**Decision:** Do not force configuration, telemetry, aggregates, and artifacts into a single storage technology.

**Reason:** Their access patterns differ substantially.

## ADR-007 — Application Must Not Depend on FrontWatch

**Decision:** SDK failures must not affect customer application correctness.

**Reason:** A monitoring product cannot become an application reliability dependency.

## ADR-008 — Investigation Drives Query Design

**Decision:** Query architecture will be derived from actual investigation workflows.

**Reason:** A storage system optimized only for writes can still produce a poor observability product if investigations are slow.

## Unresolved Decisions

The following are intentionally deferred:

- primary relational database
- telemetry database
- message broker/queue
- cache
- object storage
- orchestration platform
- API protocol
- deployment packaging
- exact SDK language/package structure
- exact frontend framework for the FrontWatch console

These should be selected through technical evaluation and benchmarking.
