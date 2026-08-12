# FrontWatch — Engineering Specs

**Status:** Draft · Consolidates: legacy `22-implementation-specifications/README.md`, `monorepo-architecture.md`, `repository-structure.md`, `implementation-rules.md`, `communication/bun-go-boundary.md`, `communication/event-contracts.md`, `communication/internal-api-contracts.md`

Implementation-level specs, one subfolder per surface actually being built (see `../FORMULA.md` §3): [`sdk/`](sdk/), [`frontend/`](frontend/), [`control-plane/`](control-plane/), [`data-plane/`](data-plane/).

## Runtime boundary

```
Control Plane → TypeScript + Bun
Data Plane    → Go
Browser SDK   → TypeScript
Frontend      → TypeScript
```

**Core rule: keep the control plane and data plane independently deployable, while using explicit contracts between them.** See `../decisions/ADR-017-control-plane-bun.md`.

## Repository structure (monorepo)

```
frontwatch/
├── apps/
│   ├── web/                 dashboard
│   └── control-api/         Bun + TypeScript
├── services/
│   └── data-plane/          Go — ONE module, multiple binaries (see data-plane/code-structure.md)
│       ├── cmd/
│       │   ├── ingestion/    main.go — HTTP server, SDK-facing
│       │   ├── worker/       main.go — Redpanda consumer, telemetry processing
│       │   ├── alert-worker/ main.go — rule evaluation
│       │   └── retention-worker/ main.go
│       └── internal/         shared by all four binaries above — see code-structure.md for what's inside
├── packages/
│   ├── contracts/           API/event schemas
│   ├── sdk/                 browser SDK
│   ├── ui/                  shared UI
│   └── config/               shared TS configuration
├── infra/                   docker, helm, local
├── docs/ · scripts/ · .github/
```

**Do not split every logical feature into a separate deployable service** — deployable boundaries follow operational needs (ADR-001), not the existence of a feature. This is exactly why `ingestion` and `worker` are two binaries inside *one* Go module rather than two separately-versioned modules: they're deployed independently (different scaling needs — ingestion is request-driven, workers are queue-driven) but they still share one codebase, one `go.mod`, one `internal/` tree. Splitting into separate modules only becomes justified if they ever need independently versioned dependencies, which they don't yet.

## The Bun ↔ Go boundary

The shared boundary between control plane and data plane is **data contracts plus storage/message infrastructure, not direct service-to-service calls:**

```
Browser → Go ingestion → Redpanda → Go processing → ClickHouse ← Bun query API
```

**Bun does not call Go internals directly.** If a direct service-to-service API becomes necessary later, introduce an explicit versioned internal contract at that point — this keeps the MVP simple and avoids unnecessary RPC complexity before it's justified.

## Event contracts

A versioned telemetry envelope, agreed between the SDK and Go ingestion **before implementation proceeds**: `event_id, event_type, schema_version, project_id, environment, release, timestamp, session_id, context, payload`. Schema version is always explicit; unknown fields are handled intentionally, not silently dropped or silently accepted; breaking changes require a compatibility strategy; contracts are tested in CI. Full wire contract detail → `../05-architecture/api-contracts.md` §4.

## Internal API contracts

The Bun control API is the public backend interface to the dashboard — its contracts define request, response, errors, pagination, filters, and authorization expectations (`../05-architecture/api-contracts.md`). For Go-facing ingestion, the dashboard/control API uses the telemetry event contract above rather than coupling itself to Go implementation details.

## The ten implementation rules

1. Prefer a modular monolith for the Bun control plane initially.
2. Keep the Go data plane small and independently scalable.
3. Do not create microservices without an operational reason.
4. Contracts precede cross-boundary implementation.
5. Tenant isolation is enforced server-side, always.
6. Telemetry is untrusted input, always.
7. Monitoring must never break the monitored application.
8. Every critical path has metrics and structured logs.
9. Every persistent schema change has a migration.
10. Benchmark ClickHouse and telemetry throughput with realistic data before finalizing sizing.
