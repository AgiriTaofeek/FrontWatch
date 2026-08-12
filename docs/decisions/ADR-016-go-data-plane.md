# ADR-016 — Go for the Data Plane

## Status
Accepted, amended by ADR-017 — scope narrowed from "backend services" to the **data plane** specifically. The control plane runs on TypeScript/Bun instead.

## Decision
Use Go for FrontWatch data-plane services: ingestion, telemetry processing, workers.

## Rationale
The data plane is dominated by network I/O, telemetry ingestion, concurrent event processing, background workers, and storage access. Go provides a strong combination of concurrency, operational simplicity, low runtime overhead, static typing, and strong tooling for this workload specifically — a JS runtime (which FrontWatch does use, for the control plane per ADR-017) is capable of this workload too, but Go's predictable memory behavior under sustained load and lighter deployment footprint fit the concurrency-bound data plane better.

## Consequence
Go's internal packages own telemetry, issues, sessions, performance, network, alerts, privacy, search, health — organization/user/application/environment/project/release *management* is control-plane-owned; the Go data plane only consumes that data via contracts. See `05-architecture/tech-stack.md`.
