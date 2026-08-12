# Backend Technology

## Scope of this document

This document covers the **data plane** — the Go services responsible for ingestion and telemetry processing.

The **control plane** (organizations, users, applications, releases, alert rules, configuration) runs on TypeScript/Bun instead. See [backend-runtime-decision.md](backend-runtime-decision.md) and [ADR-008](decisions/ADR-008-control-plane-bun.md) for that decision and its rationale.

## Decision

Use **Go** for the data-plane backend services.

## Why Go

FrontWatch's data plane is dominated by:

- network I/O
- telemetry ingestion
- concurrent event processing
- background workers
- storage access
- operational tooling

Go is a strong fit for these workloads and keeps the runtime operationally simple.

## Components

```text
Go (data plane)
├── Ingestion API
├── Processing Workers
├── Alert Evaluation Workers
├── Retention Workers
└── Platform Health Services
```

The Control Plane API is out of scope here — it lives in the TypeScript/Bun control plane (`apps/control-api`).

## Architecture Style

Use a modular codebase first.

```text
internal/
├── telemetry
├── issues
├── sessions
├── performance
├── network
├── alerts
├── privacy
├── search
└── health
```

Organization, user, application, environment, project, and release *management* are control-plane concerns owned by the Bun service — the Go data plane only consumes them (e.g. to tag telemetry with a release) via the contracts described in [bun-go-boundary.md](../22-implementation-specifications/communication/bun-go-boundary.md).

## API

Use HTTP/JSON for the public dashboard/control-plane API initially.

For internal high-throughput service communication, HTTP or gRPC can be selected per boundary.

Do not introduce gRPC everywhere merely for consistency.

## Why Not Node.js/Bun for the Data Plane?

A JS runtime is capable of this workload — and FrontWatch does use one (Bun) for the control plane — but Go provides a cleaner operational model for the ingestion/worker-heavy, concurrency-bound data plane specifically: predictable memory behavior under sustained load, a lighter deployment footprint, and stronger primitives for backpressure and worker concurrency.

## Why Not Java?

Java is highly capable at this scale, but the operational simplicity and smaller runtime footprint of Go are attractive for a self-hosted product.

## Why Not Rust?

Rust is excellent for performance and safety, but the productivity/complexity tradeoff is not compelling for the majority of FrontWatch's services. Rust can still be introduced later for a proven CPU-bound bottleneck.
