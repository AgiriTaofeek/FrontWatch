# Control Plane (Bun) — Architecture

**Status:** Draft · Consolidates: legacy `22-implementation-specifications/control-plane/bun-architecture.md`, `api-layer.md`, `module-boundaries.md`, `application-management.md`, `organization-management.md`. Runtime rationale → `../../decisions/ADR-017-control-plane-bun.md`.

## Responsibilities

The Bun control plane owns: authentication, organizations, memberships, RBAC, applications, environments, projects, credentials, releases, alerts, settings, audit APIs, and query APIs (the read side that serves the dashboard, backed by data the Go data plane has processed into ClickHouse).

## Request flow & layering

```
HTTP → Router → Authentication → Authorization → Application service → Repository → PostgreSQL / ClickHouse
```

Same discipline as the Go data plane (`../data-plane/services.md`): keep HTTP handlers thin, business rules in application/domain services, database access behind repositories/data-access modules. **Every tenant-owned query requires an authorization scope; tenant IDs supplied only by the client are never trusted** (see `../../05-architecture/security-architecture.md` §6).

API requirements: consistent error envelope, request IDs, pagination, query limits, safe errors (no internals leaked), structured logging, authorization on every protected operation. Long-running analytical/query endpoints need time-range limits, result limits, timeouts, and controlled filters — same rules as `../../05-architecture/api-contracts.md`.

## Module boundaries

`auth, organizations, memberships, applications, environments, projects, credentials, releases, alerts, audit, telemetry-query`. Each module exposes application-level operations, not database implementation details. Cross-module dependencies are intentional and one-directional where possible.

## Organization management

Core entities: Organization, User, Membership, Role. Operations: create organization, invite member, change role, remove member, list members. **Every mutation is authorized and audited.** Future enterprise capabilities (e.g. SCIM) should fit behind this existing boundary without requiring a redesign of the core model.

## Application management

Hierarchy: `Organization → Application → Environment → Project/SDK configuration`. Application APIs support creation, update, archive, retrieval. Environments explicitly identify deployment context (production/staging/development). **Credentials are scoped to the smallest useful ingestion boundary** — a project credential for one environment, never a blanket organization-wide secret.
