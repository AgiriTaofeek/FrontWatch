# Data Plane (Go) — Errors, Shutdown, Performance, Security, Observability, Testing

**Status:** Draft · Consolidates: legacy `13-backend-implementation/error-handling.md`, `graceful-shutdown.md`, `performance-concurrency.md`, `security-implementation.md`, `logging-metrics-tracing.md`, `testing-strategy.md`, `implementation-risks.md`

## Error handling

Categories: validation, authentication, authorization, not_found, conflict, dependency, internal, temporary. Domain errors are typed and meaningful; transport maps them consistently: `ErrNotFound→404, ErrForbidden→403, ErrConflict→409, validation→400/422, dependency unavailable→503`. Internal errors never expose stack traces, SQL, internal topology, or secrets to API clients — they're logged with request/trace context instead. Dependencies distinguish retryable vs. non-retryable failures. HTTP and worker boundaries recover unexpected panics, record them, and prevent one malformed event from taking down an entire processing loop.

## Graceful shutdown

Every service handles termination signals with a bounded deadline — **shutdown must never hang indefinitely.** API: SIGTERM → stop accepting new requests → finish active requests → close dependencies → exit. Ingestion: let in-flight requests complete where possible; never acknowledge a message that wasn't durably accepted. Workers: stop consuming → finish in-flight jobs → ack completed jobs → close queue connection. Database pools close only after dependent work has stopped.

## Performance & concurrency

Goroutines for concurrent I/O, always with bounded concurrency — prefer controlled worker pools over `go process(event)` for unbounded event streams. Backpressure: queue lag increases → worker concurrency/replica count scales. Bound database connection pools. Batch telemetry inserts, queue operations, and analytical writes. Every external operation accepts `context.Context` with deadlines for HTTP, database, queue, and ClickHouse calls. Use production-safe profiling for CPU hotspots, allocations, lock contention, goroutine growth — **don't optimize based on intuition alone.**

## Security implementation

Tenant scope is established from the authenticated principal, **never** from a request body field alone. Authentication (identity) and authorization (access) stay conceptually and code-wise separate. Ingestion credentials identify project/application/environment with minimal privileges. Apply input limits before expensive processing. Parameterized SQL queries always. ClickHouse filters are structured values, never arbitrary SQL fragments. Secrets use the deployment's secret mechanism and are never logged. Sensitive administrative actions are audited. Dashboard HTTP responses carry appropriate security headers. Dependencies are pinned/reviewed; production images/dependencies are scanned regularly. (See `../../05-architecture/security-architecture.md` for the umbrella threat model this implements.)

## Logging, metrics, tracing

Structured logs include timestamp, level, service, request_id, trace_id, organization scope where safe, message — **never log sensitive telemetry.** Core metrics per service: requests, errors, latency, queue depth, worker throughput, database latency, telemetry ingestion. Distributed tracing across the important internal path `Ingestion → Queue → Worker → ClickHouse`. A request ID + trace ID lets an operator follow one investigation from API request to backend operation. **Never create metric labels from arbitrary high-cardinality values** (user ID, session ID, full URL, error message) — this can destroy metrics-system performance; see the cardinality caution in `../../05-architecture/data-model.md` §6.

## Testing strategy

Unit: domain rules, application services, validation, fingerprinting, privacy logic, retry classification. Integration: against real/production-compatible PostgreSQL, ClickHouse, Redpanda where practical. API: authentication, authorization, validation, pagination, errors, tenant isolation. Ingestion: valid/malformed/oversized/duplicate events, partial batch failures, queue failures. Worker: success, retry, duplicate message, dead-letter, graceful shutdown. Contract: run against published schemas (`../../05-architecture/api-contracts.md` §15). Load: ingestion throughput, processing throughput, query latency, queue lag, storage insert performance. Security: tenant escape attempts, injection, XSS payloads, oversized payloads, credential misuse.

## Implementation risks

| Risk | Mitigation |
|---|---|
| Premature microservices | Modular codebase first (ADR-001) |
| Database leakage into business logic | Repository/query boundaries |
| Unbounded goroutines | Bounded worker pools and concurrency limits |
| Slow ingestion | Lightweight request path + durable queue (ADR-004) |
| Duplicate processing | Idempotent event handling (ADR-009) |
| Tenant data leakage | Authorization + mandatory tenant scope |
| Query explosion | Query-oriented services, limits, aggregates |
| Sensitive data in logs | Structured logging rules and redaction |
| Self-hosted upgrade failure | Versioned migrations and compatibility testing |
| Hidden operational dependencies | Explicit health checks, dependency documentation, full local stack |
