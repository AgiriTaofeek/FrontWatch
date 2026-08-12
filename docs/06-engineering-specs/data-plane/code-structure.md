# Data Plane (Go) — Code Structure

**Status:** Draft · Consolidates: legacy `13-backend-implementation/go-project-structure.md`, `domain-layer.md`, `application-layer.md`, `module-boundaries.md`, `dependency-direction.md`, `configuration.md`. Runtime split rationale → `../../decisions/ADR-016-go-data-plane.md`.

## Project layout (conceptual)

```
cmd/            ingestion/ · worker/ · alert-worker/ · retention-worker/   (each with main.go)
internal/       telemetry, issue, session, performance, network, alert, privacy, search, health,
                platform/{config,logging,metrics,tracing}, storage/clickhouse
pkg/contracts/  genuinely reusable public packages only — used sparingly
```

`cmd/` holds executable entry points. `internal/` holds implementation not importable externally. **No `cmd/api` and no `organization`/`application`/`release` modules here** — those are Bun-owned per ADR-017 and live in `../control-plane/`; earlier drafts of this file predated that split. The Go data plane only ever *consumes* application/environment/release identity (as typed reference IDs on incoming events), never creates or manages it. **Open question, not yet resolved:** exactly how ingestion validates a project credential — a direct read against Postgres, a replicated/cached copy, or a call to the control plane — isn't decided anywhere in these docs yet. Don't assume Go has its own Postgres access until that's actually settled; it isn't in this file's layout for that reason.

## Dependency direction (strict)

```
HTTP / Queue / DB → Adapters → Application Services → Domain
```

- **Domain** depends on almost nothing external — no PostgreSQL, ClickHouse, Redpanda, or HTTP imports, ever.
- **Application** depends on domain and interfaces only.
- **Infrastructure** implements those interfaces.

This enables unit testing, storage/transport swaps, and easier reasoning — and forbids `domain → PostgreSQL/HTTP/ClickHouse/Redpanda` couplings outright.

## Domain layer

Contains business concepts and rules that are genuinely Go-owned: Issue, IssueFingerprint, Alert, AlertRule (evaluation, not CRUD — see Module boundaries below). Domain rules are enforced here (an issue belongs to an application scope; a fingerprint determines issue grouping). Application/Environment/Release/Deployment appear in the Go domain only as **typed reference identifiers** (ApplicationID, EnvironmentID, ReleaseID, IssueID, SessionID, EventID) attached to events and issues — Go treats them as opaque references it received, not aggregates with business rules it enforces; that management lives in `../control-plane/`. Domain errors are meaningful and typed (`ErrNotFound`, `ErrForbidden`, `ErrInvalidState`, `ErrConflict`) — transport layers translate these into API responses, the domain never knows what an HTTP status code is.

## Application layer

Orchestrates use cases: `Ingestion Handler → IngestTelemetryService → {Validation, Queue publish}` and `Worker → ProcessEventService → {Fingerprinting, Issue repository, Telemetry storage}`. Application services validate business intent, coordinate domain operations, enforce authorization boundaries, and call repositories/interfaces — they **never** parse HTTP directly, build SQL directly, know ClickHouse table names, manipulate HTTP headers, or contain framework-specific code. Example use cases: IngestTelemetry, ProcessEvent, GetApplicationHealth (query), GetIssueInvestigation (query), GetSessionTimeline (query), EvaluateAlertRule, TriggerAlert. **Not Go use cases:** CreateApplication, CreateEnvironment, RegisterRelease, CreateAlertRule — those are control-plane (Bun) operations; see `../control-plane/architecture.md`.

## Module boundaries

| Module | Owns |
|---|---|
| Telemetry | event validation, normalization, processing |
| Issues | fingerprinting, grouping, issue lifecycle |
| Sessions | session metadata, timeline retrieval |
| Performance | performance queries, metric aggregation |
| Network | request queries, endpoint normalization |
| Alerts | rule **evaluation** and alert lifecycle (not rule CRUD — that's control-plane) |
| Privacy | redaction policy, field classification, retention policy |
| Search | telemetry/issue search |
| Health | service/telemetry/platform health |

Organization, Application, Environment, Release, and Deployment **management** are not Go modules at all — they're control-plane-owned (ADR-017). Go only consumes their identifiers via the event envelope. **A module exposes business capabilities, not database tables** — `GetIssueInvestigation()`, never `GetIssueTableRows()`.

## Configuration

Categories: server, database, clickhouse, queue, object storage, authentication, telemetry, privacy, retention, logging, metrics, tracing. Environment variables carry deployment configuration; secrets are never committed to the repository. Configuration loads into typed Go structures and is validated at startup — **if required configuration is invalid, log a clear error and exit; never start in a partially-configured state** unless explicitly designed for it. Customer-level settings (sampling, retention, privacy, alerts) belong in control-plane storage, not static process configuration, where they need to be changeable without a redeploy.
