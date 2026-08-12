# FrontWatch — Backend Implementation Plan

This phase turns the architecture into an implementation blueprint for the Go **data-plane** backend (ingestion, processing, workers).

The control plane (organizations, users, applications, environments, projects, releases, alert rules, configuration) is implemented separately in TypeScript/Bun — see [22-implementation-specifications/control-plane/](../22-implementation-specifications/control-plane/) and [ADR-008](../10-technology-stack/decisions/ADR-008-control-plane-bun.md).

## Implementation order

```text
Architecture
    ↓
Backend boundaries
    ↓
Go module structure
    ↓
Domain/application layers
    ↓
API handlers
    ↓
Ingestion
    ↓
Workers
    ↓
Storage adapters
    ↓
Security
    ↓
Testing
    ↓
Deployment
```

## Core principles

1. Keep domain logic independent from infrastructure.
2. Keep handlers thin.
3. Treat telemetry as untrusted input.
4. Keep ingestion fast.
5. Make workers retry-safe.
6. Make tenant isolation explicit.
7. Prefer simple modules before distributed services.
8. Make failure behavior explicit.
9. Instrument FrontWatch itself.
10. Optimize only after measuring.

## Initial data-plane components

```text
Ingestion API
Telemetry Worker
Alert Worker
Retention Worker
Health/Platform Module
```

These can initially be built from one Go repository and deployed independently where useful.

The Control API is out of scope for this Go repository — it is the TypeScript/Bun control plane described above.
