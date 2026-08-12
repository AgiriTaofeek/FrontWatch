# Go Project Structure

Recommended conceptual layout:

```text
cmd/
├── api/
│   └── main.go
├── ingestion/
│   └── main.go
├── worker/
│   └── main.go
├── alert-worker/
│   └── main.go
└── retention-worker/
    └── main.go

internal/
├── auth/
├── organization/
├── application/
├── environment/
├── project/
├── release/
├── deployment/
├── telemetry/
├── issue/
├── session/
├── performance/
├── network/
├── alert/
├── privacy/
├── search/
├── health/
├── audit/
├── platform/
│   ├── config/
│   ├── logging/
│   ├── metrics/
│   └── tracing/
└── storage/
    ├── postgres/
    ├── clickhouse/
    └── objectstore/

pkg/
└── contracts/
```

## Dependency direction

```text
HTTP / transport
      ↓
Application services
      ↓
Domain
      ↓
Interfaces
      ↓
Infrastructure implementations
```

Infrastructure should not leak into domain objects.

## `cmd`

Contains executable entry points.

## `internal`

Contains application implementation that should not be imported externally.

## `pkg`

Use sparingly for genuinely reusable public packages.
