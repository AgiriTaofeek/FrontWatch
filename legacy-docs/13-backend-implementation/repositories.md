# Repository & Storage Interfaces

## Principle

Business logic should depend on interfaces rather than database implementations.

Example:

```go
type ApplicationRepository interface {
    Create(ctx context.Context, app Application) error
    Get(ctx context.Context, id ApplicationID) (Application, error)
}
```

The actual PostgreSQL implementation lives elsewhere.

## Telemetry

Telemetry should have query-oriented interfaces rather than pretending ClickHouse is a generic CRUD database.

Example concepts:

```text
IssueQuery
SessionQuery
PerformanceQuery
NetworkQuery
HealthQuery
```

## Why

This keeps:

```text
business logic
```

separate from:

```text
storage mechanics
```

## Avoid Over-Abstraction

Do not create generic repositories for every table merely because an interface is possible.

Use interfaces at meaningful dependency boundaries.
