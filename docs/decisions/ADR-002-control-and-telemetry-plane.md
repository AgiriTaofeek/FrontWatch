# ADR-002 — Separate Control Plane and Telemetry Plane

## Status
Accepted

## Decision
Architect FrontWatch around two logical planes: **Control Plane** (organizations, users, applications, environments, releases, configuration, alerts, permissions) and **Telemetry Plane** (ingestion, processing, events, issues, sessions, performance, network, aggregates).

## Rationale
Their workloads are fundamentally different — control plane is transactional, lower volume, relational; telemetry plane is high volume, append-oriented, time-oriented, analytics-heavy.

## Consequence
The system scales and evolves each plane independently. This is the foundational split behind ADR-011/012 (Postgres/ClickHouse) and ADR-016/017 (Go data plane / Bun control plane). See `05-architecture/system-architecture.md` §3.
