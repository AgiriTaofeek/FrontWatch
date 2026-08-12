# ADR-008 — TypeScript/Bun for the Control Plane

## Status

Accepted — amends [ADR-001](ADR-001-go-backend.md), which originally scoped Go across the entire backend.

## Decision

Run the control plane (organizations, users, applications, environments, projects, releases, alert rules, configuration) on **TypeScript, on the Bun runtime**, as an independently deployable service from the Go data plane.

## Rationale

The control plane is dominated by:

- CRUD-shaped resource management
- request/response API handlers
- auth and session handling
- relatively low, bursty traffic compared to telemetry ingestion

This workload favors developer velocity and shared typing with the TypeScript dashboard over Go's concurrency-first strengths, which matter most for the ingestion/worker-heavy data plane. Bun gives a fast, low-overhead JS/TS runtime without taking on Node's slower cold starts and heavier tooling baseline.

Splitting the runtime by plane, rather than using one language for the whole backend, keeps each side optimized for its actual workload:

```text
Control Plane → TypeScript + Bun   (resource management, low/bursty traffic)
Data Plane    → Go                 (ingestion, processing, concurrency-bound)
```

## Consequence

- The control plane and data plane are independently deployable services with an explicit contract between them — see [bun-go-boundary.md](../../22-implementation-specifications/communication/bun-go-boundary.md) and [internal-api-contracts.md](../../22-implementation-specifications/communication/internal-api-contracts.md).
- Go internal packages no longer own organization/user/application/environment/project/release *management* (see [backend.md](../backend.md)); the Go data plane only consumes that data via contracts.
- Two runtime toolchains must be maintained instead of one. This is an accepted operational cost in exchange for each plane being implemented in the runtime best suited to its workload.
- [ADR-001](ADR-001-go-backend.md) remains accurate for the data plane; its "Go for backend services" framing should be read as "Go for the data plane" going forward.
