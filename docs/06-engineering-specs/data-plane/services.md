# Data Plane (Go) — Services

**Status:** Draft · Consolidates: legacy `13-backend-implementation/api-handlers.md`, `ingestion-service.md`, `telemetry-processing.md`, `worker-architecture.md`, `repositories.md`, `clickhouse-access.md`, `postgresql-access.md`

## API handlers

Responsibilities, strictly in order: authenticate → authorize → parse input → validate request shape → call application service → map result to response → map errors consistently. Handlers **never** contain business rules, SQL, ClickHouse queries, or complex telemetry processing — that all lives in the application/domain layers (`code-structure.md`). Request flow: `HTTP → Middleware → Handler → Application Service → Repository/Query → Response`. Validate required fields, enum values, lengths, ranges, timestamps, pagination, filters. Responses are explicit API DTOs — internal domain/storage objects are never exposed directly.

## Ingestion service

Goal: accept telemetry quickly and safely. Path: `HTTP → credential validation → payload validation → limits → privacy checks (at the boundary, where possible) → queue publish → acknowledgement`. **Never** do `parse → fingerprint → ClickHouse insert → issue grouping → respond` synchronously in the request path — that makes ingestion latency-dependent on downstream systems (ADR-004). Accepts batches. Under queue unavailability/saturation, fails predictably rather than consuming unlimited memory. Every field is untrusted input. Metrics recorded: `ingestion_requests_total, ingestion_events_accepted_total, ingestion_events_rejected_total, ingestion_latency, payload_bytes, queue_publish_failures`.

## Telemetry processing (workers)

Pipeline: `Raw event → Decode → Validate → Normalize → Privacy enforcement → Enrich → Fingerprint → Persist → Aggregate`. Normalize converts framework-specific data into the common event model. **Privacy enforcement here is independent of UI authorization** — it's a second, server-side layer on top of the SDK's client-side redaction (ADR-007). Fingerprinting converts error events into stable grouping keys. Enrichment adds safe derived context (browser family, device class, normalized route, release metadata). Issue state and aggregates should be recomputable from telemetry where practical (ADR-008/009). A malformed event must never terminate the entire worker process.

## Worker architecture

Loop: `receive message → decode → validate → process → persist → ack`; retryable failure → retry; permanent failure → dead-letter. Bounded concurrency — controlled worker pools, never unbounded goroutines per event. Graceful shutdown on SIGTERM: stop accepting new work → finish in-flight work → flush/ack safely → exit. Bounded retries with backoff. Workers must tolerate duplicate messages via event IDs and appropriate storage constraints (ADR-009). Worker types: TelemetryWorker, AlertWorker, RetentionWorker — additional worker types are introduced only when workload actually requires them, not speculatively.

## Repositories & storage access

Business logic depends on interfaces, not database implementations:
```go
type ApplicationRepository interface {
    Create(ctx context.Context, app Application) error
    Get(ctx context.Context, id ApplicationID) (Application, error)
}
```
Telemetry gets query-oriented interfaces (`IssueQuery`, `SessionQuery`, `PerformanceQuery`, `NetworkQuery`, `HealthQuery`) rather than pretending ClickHouse is a generic CRUD store. **Avoid over-abstraction** — don't create a generic repository for every table merely because an interface is possible; add interfaces at meaningful dependency boundaries only.

**ClickHouse access:** owns high-volume telemetry and analytical queries; SQL lives behind a Query Service → ClickHouse repository/query adapter, never scattered across handlers. Every query considers time range, tenant/application scope, dimensions, and result limit. Workers use efficient batch inserts, not one row per round trip. Enforce query timeouts, max result sizes, and resource limits. Schema changes account for long-lived self-hosted installations. Test against representative datasets, not tiny fixtures, when evaluating query performance.

**PostgreSQL access:** owns organizations, users, memberships, applications, environments, projects, releases, deployments, alert_rules, audit_records. A driver plus a small data-access layer. Transactions for operations that need atomicity (e.g. create application + initial environment + project, if the product requires that to be atomic). Versioned migrations — deterministic, reviewable, reversible where practical, safe for production. Explicit, bounded connection pool (max open, max idle, connection lifetime) — never unbounded.
