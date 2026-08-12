# FrontWatch — API Contracts

**Status:** Draft · Consolidates all 16 files of legacy `11-api-contracts/`

## 1. Contract hierarchy

`SDK → Ingestion API → Telemetry Event Contract → Processing → Query API → FrontWatch Web App`. The browser SDK and ingestion API are an **untrusted-input boundary**; the dashboard API is an **authenticated application API** — they must not share a security model (see `security-architecture.md`).

API families: Control Plane API, Telemetry Ingestion API, Query API, Alert API, Health API.

## 2. Conventions

- Protocol: HTTPS. Base version namespace: `/api/v1` (telemetry ingestion may use a dedicated namespace since its traffic/auth model differs).
- Content type: `application/json`; batch telemetry requests may use compressed bodies.
- IDs: opaque identifiers — clients never depend on database-specific IDs.
- Timestamps: ISO 8601 at every API boundary, e.g. `2026-08-11T14:30:00Z`.
- Pagination: cursor-based for large datasets — `GET /api/v1/issues?cursor=...` → `{"data": [...], "next_cursor": "..."}`. Cursors are opaque, stable enough to traverse, non-sensitive, and independent of physical storage.
- Every list endpoint defines a default limit and a maximum limit.
- Filtering: explicit and bounded (e.g. `?environment=production&from=...&to=...&release=...`) — never expose an arbitrary database query language through the public API.
- Sorting: only an approved, explicit set of sortable fields.
- Errors: consistent shape — `{"error": {"code": "INVALID_REQUEST", "message": "...", "request_id": "req_123"}}`. Every response is traceable via request ID.
- Idempotency: mutation endpoints that may be retried support it where required; telemetry ingestion primarily dedupes via `event_id`.

## 3. Telemetry Ingestion API

`POST /ingest/v1/events`, authenticated with the project ingestion credential.

```json
// Request
{
  "schema_version": 1,
  "sent_at": "2026-08-11T14:30:00Z",
  "events": [
    { "event_id": "evt_123", "event_type": "error", "timestamp": "2026-08-11T14:29:59.123Z",
      "release": "2026.08.11", "session_id": "sess_123", "route": "/dashboard", "payload": {} }
  ]
}
// Response
{ "accepted": 1, "rejected": 0, "request_id": "req_123" }
```

Behavior: `Authenticate → Validate → Apply ingestion limits → Durably enqueue → Acknowledge`. Expensive processing happens asynchronously (see `system-architecture.md` §7-8). **Partial acceptance is required** — a batch with some invalid events shouldn't be discarded wholesale:

```json
{ "accepted": 98, "rejected": 2, "rejections": [{ "event_id": "evt_7", "code": "INVALID_EVENT" }] }
```

Enforced limits: max body size, max batch size, max event size, max nesting, rate limits. Compression supported for batches. The SDK must distinguish **accepted / rejected / retryable failure / non-retryable failure** in the response semantics.

## 4. Telemetry event contract (wire format)

```json
{
  "event_id": "evt_123", "schema_version": 1, "event_type": "error",
  "timestamp": "2026-08-11T14:29:59.123Z", "release": "2026.08.11", "session_id": "sess_123",
  "route": "/dashboard",
  "client": { "browser": "Chrome", "browser_version": "149", "os": "macOS", "device": "desktop" },
  "payload": {}
}
```

Required fields: `event_id, schema_version, event_type, timestamp, payload` — project/application/environment identity comes from the ingestion credential and/or validated event context, not from the payload. Payload shapes per event_type are defined in `data-model.md` §3 (error / network / performance / breadcrumb examples repeated here for the wire contract: error → `{message, exception_type, stack_trace, fingerprint, handled}`; network → `{method, resource, status, duration_ms, outcome}`; performance → `{metric, value, route}`; breadcrumb → `{category, message, metadata}`). Credentials and sensitive form values are excluded by default. **Event schema is versioned independently from the API version** — `API v1` and `Event schema v1` can change on different timelines; a new API version doesn't imply a new event schema.

## 5. Query API

| Endpoint | Purpose | Filters |
|---|---|---|
| `GET /api/v1/applications/{id}/health` | Application health | environment, time range |
| `GET /api/v1/applications/{id}/issues` | Issue list | environment, status, release, route, from, to, query |
| `GET /api/v1/issues/{id}` | Issue detail (enough for the initial investigation view) | — |
| `GET /api/v1/issues/{id}/occurrences` | Occurrence list | cursor-paginated |
| `GET /api/v1/sessions/{id}` / `.../timeline` | Session detail / timeline | time/cursor bounds |
| `GET /api/v1/applications/{id}/performance` | Performance | metric, route, browser, device, release, environment, from, to |
| `GET /api/v1/applications/{id}/network` | Network | route, resource, status, release, environment, from, to |
| `GET /api/v1/applications/{id}/releases` / `GET /api/v1/releases/{id}` | Releases | — |

Health response shape:
```json
{ "status": "degraded", "error_rate": 0.042, "active_issues": 12, "failed_requests": 87,
  "telemetry": { "status": "healthy", "last_event_at": "2026-08-11T14:29:59Z" } }
```

Principle: the API returns domain-oriented responses, never a direct pass-through of ClickHouse/PostgreSQL schema.

## 6. Application & configuration API

```
POST/GET/PATCH/DELETE  /api/v1/applications[/{id}]
POST/GET/PATCH/DELETE  /api/v1/applications/{id}/environments[/{id}]
POST/GET                /api/v1/applications/{id}/projects        (project credentials never returned unnecessarily)
POST/GET                /api/v1/applications/{id}/releases[/{id}]
POST/GET                /api/v1/releases/{id}/deployments · /api/v1/environments/{id}/deployments
```

Application configuration (sampling defaults, privacy rules, retention configuration, alert configuration, SDK settings) is kept separate from telemetry ingestion.

## 7. Alerts API

```
POST/GET/PATCH/DELETE  /api/v1/applications/{id}/alert-rules[/{id}]
GET                      /api/v1/applications/{id}/alerts · /api/v1/alerts/{id}
POST                     /api/v1/alerts/{id}/acknowledge · /api/v1/alerts/{id}/resolve
```

Rule example: `{"name": "High frontend error rate", "metric": "error_rate", "operator": "gt", "threshold": 0.05, "window_seconds": 300, "environment": "production", "enabled": true}`. Alert evaluation is asynchronous — the API manages configuration/state, workers evaluate telemetry-derived conditions.

## 8. Health & readiness API

`GET /health/live` (process alive) vs. `GET /health/ready` (service can perform its role) — **these are different questions**, and neither implies "telemetry fully healthy." Internal/admin health additionally exposes database, queue, telemetry store, object storage, and worker status. The dashboard exposes telemetry freshness separately from infrastructure health.

## 9. Authentication & authorization

Dashboard API uses authenticated user sessions/tokens: `User → Identity Provider → authenticated principal → FrontWatch API`. The ingestion API uses a project-scoped credential that must never authorize organization administration, user management, dashboard configuration, or arbitrary data access. Every protected request establishes `principal → organization → resource`server-side. **Tenant isolation is non-negotiable:** `GET /organizations/org_B/issues` must be rejected if the principal only belongs to org_A — the client is never trusted to self-select an organization. Roles: Administrator, Engineer, Viewer. Separate credential classes exist for ingestion, API automation, and administration. Project ingestion credentials support create/rotate/revoke with controlled old→new migration.

## 10. Errors & rate limits

| Code | Meaning | Retryable? |
|---|---|---|
| 400 INVALID_REQUEST | — | No |
| 401 UNAUTHENTICATED / 403 FORBIDDEN | — | No |
| 404 NOT_FOUND | — | No |
| 409 CONFLICT | — | No |
| 413 PAYLOAD_TOO_LARGE | — | No |
| 422 INVALID_EVENT | — | No |
| 429 RATE_LIMITED | — | **Yes** |
| 500 INTERNAL_ERROR | — | No |
| 502/503/504 | — | **Yes** |

Shape: `{"error": {"code": "RATE_LIMITED", "message": "...", "request_id": "req_123", "retry_after_seconds": 10}}`. Rate limits are scoped per project/organization/credential for ingestion, and per user/organization for dashboard APIs; provide `Retry-After` where applicable. Error messages never expose secrets, internal stack traces, database details, or sensitive telemetry.

## 11. Pagination, filtering & search

Cursor pagination for telemetry and large collections; every list endpoint has a default and max limit. Telemetry queries generally require or infer a bounded time range (`from`/`to`) — unbounded production telemetry queries are avoided. Supported filters are explicit (environment, release, route, browser, device, status, event_type); issue search may match title/message/fingerprint but never exposes a raw query language. Query safety: max time range, max result size, query timeout, complexity limits.

## 12. Versioning & compatibility

Public APIs use major-version namespaces (`/api/v1`, `/api/v2`). Within a major version: don't remove fields unexpectedly, don't change field meaning, don't change error semantics undocumented; adding optional fields is backward-compatible. **Event schema versioning is independent of API versioning.** The backend must support telemetry from all currently-supported SDK versions. Deprecated APIs get documentation, a replacement, a timeline, and migration guidance. **Self-hosted customers upgrade less often than SaaS customers** — compatibility windows must account for long-lived installations, not just the latest release.

## 13. Webhooks & integrations

Purpose: notify external systems without coupling the core alert engine to every vendor. `POST customer-configured-url`. Initial event types: `alert.triggered, alert.recovered, issue.created, issue.regression`. Security: signing secret, timestamp, replay protection, retry, delivery ID — conceptual headers `X-FrontWatch-Delivery`, `X-FrontWatch-Timestamp`, `X-FrontWatch-Signature`. Bounded retries with exponential backoff; consumers dedupe via delivery ID. Webhooks are an integration boundary and must stay out of the core telemetry ingestion path.

## 14. API security requirements

Validate types/lengths/nesting/enumerations/timestamps/identifiers on everything. **All browser-provided values are attacker-controlled** — `error.message`, route, URL, browser, metadata, stack_trace included. Authorization happens before any protected data is returned; every query is tenant-scoped; use parameterized queries/safe query builders, never string-concatenate user filters into a query. Protect against resource exhaustion (huge payloads/batches, expensive queries, excessive pagination, repeated retries). No telemetry- or webhook-configured value may cause an unintended internal network request (SSRF) without explicit controls. Security-sensitive configuration changes are audited. Responses return only the fields the client workflow actually needs.

## 15. Contract testing

Layers: **unit** (handlers, domain functions) · **integration** (API↔database, ingestion↔queue) · **contract** (responses conform to the published spec) · **telemetry compatibility** (representative event fixtures from supported SDK versions run through ingestion). Maintain golden fixtures for error, network, performance, navigation, breadcrumb, session events, and a compatibility matrix (current/previous/old SDK × event schema × backend support). **A breaking contract change fails CI before deployment**, not after.

## 16. OpenAPI & contract generation

Maintain an OpenAPI spec for the control/query APIs; use it to generate/validate client types, docs, and contract tests. The telemetry event contract gets its own schema definition (different evolution/throughput requirements). Avoid three independently-maintained sources of truth (Go structs + OpenAPI + frontend types) — pick one explicit source-of-truth workflow. Every released API version has a corresponding versioned contract artifact.

## 17. API risks

| Risk | Mitigation |
|---|---|
| Telemetry flood (compromised page / buggy SDK) | Rate limits, quotas, payload limits, sampling, backpressure |
| Query abuse (repeated expensive analytical queries) | Bounded time windows, query limits, timeouts, caching, authorization |
| Contract drift (SDK/backend evolve independently) | Event schema versions, compatibility tests, contract fixtures |
| Sensitive data exposure via telemetry | SDK redaction, ingestion validation, access control, safe serialization, audit |
| Duplicate events from network retries | Event IDs, idempotent processing |
| Partial batch failure discarding valid events | Per-event validation, partial-acceptance response |
| Self-hosted version drift | Explicit API compatibility policy, migrations, deprecation windows |
