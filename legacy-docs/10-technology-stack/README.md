# FrontWatch — Technology Stack

This phase converts the architecture and data requirements into a concrete technology baseline.

## Decision principle

Choose technologies based on:

1. Banking/privacy requirements
2. Self-hosting
3. Telemetry throughput
4. High-cardinality investigation
5. Query latency
6. Reliability
7. Operational complexity
8. Developer experience
9. Long-term maintainability
10. Ability to scale from a small installation to a large bank

## Recommended Baseline

FrontWatch's backend is split into two independently deployable runtimes — see [backend-runtime-decision.md](backend-runtime-decision.md) and [ADR-008](decisions/ADR-008-control-plane-bun.md) for the rationale.

```text
Web Dashboard
├── TypeScript
├── React
└── React Router / chosen routing layer

Control Plane
├── TypeScript
└── Bun
    └── Control Plane API

Data Plane
├── Go
├── Telemetry Ingestion
└── Telemetry Processing

Control Database
└── PostgreSQL

Telemetry Analytics Store
└── ClickHouse

Event Streaming
└── Redpanda

Cache / ephemeral coordination
└── Valkey

Object Storage
└── S3-compatible object storage

Telemetry interoperability
└── OpenTelemetry-compatible concepts / OTLP where useful

Authentication
└── OIDC-compatible identity provider; Keycloak is the initial self-hosted candidate

Containerization
└── Docker

Production orchestration
└── Kubernetes

Infrastructure as Code
└── Terraform / OpenTofu-compatible approach

Observability
└── OpenTelemetry + Prometheus-compatible metrics
```

## Important

This is the **recommended architecture baseline**, not a claim that every component must be present in the MVP.

For example, the first small installation may avoid a separate cache or stream cluster if measurements show that a simpler topology is sufficient.

The architecture should scale by adding infrastructure where workload requires it.
