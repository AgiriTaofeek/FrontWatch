# FrontWatch — Data Model

**Status:** Draft · Consolidates all of legacy `09-data-model/` (entity-model, telemetry-schema, relationships, retention-model, partitioning-strategy, indexing-strategy, consistency-and-idempotency, data-security, query-matrix, migration-versioning, physical-model-checklist)

This is the logical data model — entities, relationships, schema, retention, partitioning, indexing, and consistency rules. It intentionally does not choose final storage internals beyond what's already decided in `tech-stack.md` (PostgreSQL for control plane, ClickHouse for telemetry).

## 1. Entities — control plane (PostgreSQL)

| Entity | Key attributes | Notes |
|---|---|---|
| **Organization** | id, name, status, created_at, updated_at | — |
| **User** | id, email, name, status, created_at, updated_at | — |
| **Membership** | id, organization_id, user_id, role, status, created_at | `unique(organization_id, user_id)` |
| **Application** | id, organization_id, name, framework, status, created_at, updated_at | — |
| **Environment** | id, application_id, name, type, status, created_at | type: development / staging / production / custom |
| **Project** | id, application_id, environment_id, public_key, status, created_at | the SDK/telemetry identity boundary |
| **Release** | id, application_id, version, commit_sha, metadata, created_at | — |
| **Deployment** | id, release_id, environment_id, deployed_at, source, metadata | represents Release + Environment + Time |
| **AlertRule** | id, application_id, environment_id, name, condition, threshold, window, notification_config, enabled, created_at | — |
| **AuditRecord** | id, organization_id, actor_id, action, resource_type, resource_id, timestamp, metadata | for member/role/credential/retention/privacy changes |

## 2. Entities — telemetry plane (ClickHouse)

| Entity | Key attributes | Notes |
|---|---|---|
| **Event** | event_id, organization_id, application_id, environment_id, release_id, session_id, event_type, client_timestamp, server_received_at, schema_version, route, client_context, payload | canonical envelope; payload shape varies by event_type; physical representation depends on the storage engine |
| **Session** | session_id, application_id, environment_id, started_at, last_seen_at, browser, device, metadata | — |
| **Issue** | id, application_id, environment_id, fingerprint, title, status, first_seen_at, last_seen_at, occurrence_count | a *grouping*, not an individual event |
| **IssueOccurrence** | id, issue_id, event_id, session_id, release_id, occurred_at, route | connects an issue to a concrete event + context |
| **Alert** | id, alert_rule_id, triggered_at, recovered_at, status, observed_value, context | status: triggered / acknowledged / recovered / resolved |

## 3. Telemetry event schema (the wire contract)

Common envelope on every event:

```
event_id · schema_version · event_type
organization_id · application_id · environment_id · project_id
release_id? · session_id?
client_timestamp · server_received_at
route? · browser? · browser_version? · os? · device?
payload
```

| event_type | payload fields |
|---|---|
| **error** | message, exception_type, stack_trace, fingerprint, source_location, mechanism, handled, metadata |
| **network** | method, normalized_resource, status, duration_ms, outcome, error_type — **never** sensitive request/response bodies by default |
| **performance** | metric_name (LCP/CLS/INP/FCP/navigation/resource/long_task), value, route, navigation_type, attribution |
| **breadcrumb** | category, message, timestamp, metadata |
| **navigation** | from_route, to_route, navigation_type, duration |
| **interaction** | category, target_type, target_identifier, timestamp — sensitive input values always excluded |

Every event carries `schema_version`; the backend maintains explicit compatibility rules across versions (§8). The logical schema enforces bounded payload sizes — arbitrary large blobs are never allowed into the primary telemetry stream without an intentional design decision.

## 4. Relationships

```
Organization 1──N Membership          Application 1──N Environment
Organization 1──N Application         Application 1──N Project
User 1──N Membership                  Application 1──N Release
Release 1──N Deployment               Environment 1──N Deployment
Application 1──N Event                Environment 1──N Event
Release 1──N Event                    Session 1──N Event
Issue 1──N IssueOccurrence            Event 1──0..1 IssueOccurrence
Session 1──N IssueOccurrence          Release 1──N IssueOccurrence
AlertRule 1──N Alert                  Application 1──N AlertRule
Organization 1──N AuditRecord         User 1──N AuditRecord
```

**Important rule:** telemetry relationships must tolerate missing context. `Event{release_id: null, session_id: null}` can be a perfectly valid event — the ingestion pipeline must never reject otherwise-valid telemetry merely because optional context is unavailable.

## 5. Query matrix (this drives indexing and storage design, not the other way around)

| Query | Main dimensions | Time-bound | Frequency |
|---|---|---:|---:|
| Application health | app, environment, time | Yes | Very high |
| Active issues | app, environment, status | Usually | Very high |
| Issue occurrences | issue, time, release | Yes | High |
| Session timeline | session, timestamp | Yes | High |
| Network failures | app, route, status, time | Yes | High |
| Performance by route | app, route, metric, time | Yes | High |
| Release comparison | app, release, time | Yes | High |
| Error trend | app, issue/event type, time | Yes | Very high |
| Browser / device impact | app, browser/device, time | Yes | Medium |
| Alert evaluation | rule, metric, time | Yes | High |
| Audit search | org, actor, action, time | Yes | Low |

Storage design should be optimized around the top of this table first: health, issues, error trends, issue investigation, session timelines, release comparison.

## 6. Indexing strategy

Indexes are driven by the query matrix above, not by indexing every available field — **an index should answer a known product query; avoid speculative indexing.**

Control-plane indexes: Organization(id) · Membership(organization_id, user_id, unique) · Application(organization_id) · Environment(application_id) · Release(application_id, version, created_at) · Deployment(environment_id, deployed_at, release_id).

Telemetry access dimensions: application, environment, timestamp, event_type, release, issue, session, route — **time is a first-class dimension**, since most telemetry queries are time-bounded, so physical storage must support efficient time filtering and retention. Optimize specifically for: issue queries (`application + environment + issue + time`), session queries (`session_id + timestamp`), release queries (`application + release + time`), and route queries (`application + route + time`, only if route-level investigation is frequent enough to justify it).

**High-cardinality caution:** session_id, user_id, full URL, error fingerprint, and request ID are dangerous to index blindly — don't automatically create expensive indexes for every high-cardinality field.

## 7. Partitioning strategy

Primary candidate: **time-based partitioning** (e.g. daily). Secondary considerations depending on storage technology/scale: application, tenant, event category — but excessive tenant/application partitioning creates too many small partitions, so use with care. Benefits: retention becomes "drop the partition" instead of row-by-row deletion; a "last 24 hours" query scans only relevant partitions. **Don't select a partitioning strategy from theory alone** — benchmark against expected events/sec, events/day, organization count, application count, query concurrency, and retention duration.

## 8. Retention model

Retention differs by data class: raw events (shorter) · issue records (longer) · aggregated metrics (longer) · audit records (policy-defined) · release metadata (longer). Exact periods are a product/customer policy decision, configurable by organization, application, environment, event type, and data classification. Expiration must remove or invalidate raw events, indexes, any aggregates derived from expired data, cached results, and object artifacts — **retention must never silently override a stricter deletion requirement.** Self-hosted customers must be able to see what's retained, where, when it expires, and how deletion occurs.

## 9. Consistency & idempotency

Control-plane data (membership, permissions, application configuration, release metadata) needs strong transactional consistency. Telemetry processing is allowed to be **eventually consistent** — a short delay between "event observed" and "event visible in dashboard" is acceptable and must be made observable (see ADR-003 in `decisions/`).

- **Event idempotency:** `event_id` is the deduplication key — an event may be delivered more than once.
- **Worker idempotency:** a worker may receive the same message twice; operations must be safe to retry.
- **Issue creation:** grouping must not create duplicate issues for the same fingerprint/application scope.
- **Aggregation:** must tolerate retries or use mechanisms that make repeated processing safe.
- **Delivery model:** don't assume end-to-end exactly-once. Prefer **at-least-once delivery + idempotent processing.**

## 10. Data security (data-model level — see `security-architecture.md` for the full model)

Every data access path establishes `authenticated principal → organization → resource`, enforced **server-side** — never trust a frontend-selected `organization_id`/`application_id`/`environment_id` without validating authorization. Telemetry ingestion credentials must be scoped, revocable, rotatable, and non-administrative. The data model must assume telemetry can contain attacker-controlled strings, so displayed values are always safely encoded, inputs validated, query parameters sanitized, injection and dashboard XSS prevented. Security-sensitive actions (member added, role changed, credential rotated, retention changed, privacy rule changed) always produce an AuditRecord. Deployment architecture must support customer-controlled encryption at rest where required.

## 11. Schema versioning & migration

Two independently versioned concepts: the **product database schema** (organizations, applications, releases, alerts — controlled migrations) and the **telemetry event schema** (error/network/performance payloads — versioned separately because old SDK versions may stay deployed for a long time). Migration principles: migrations must be backward-aware where rolling deployments require it · destructive changes are staged · large telemetry migrations must not block ingestion · event compatibility is explicit.

**Rolling upgrade sequence:** old API supports old+new schema → deploy new workers (process old+new events) → deploy new SDK → remove old compatibility. Self-hosted upgrade docs must identify required version, database changes, event compatibility, downtime requirements, and rollback considerations (see `08-operations-release/`).

## 12. Physical model checklist (verify before finalizing storage implementation)

**Volume:** expected/peak events per second, events/day, average and maximum event size, retention duration. **Tenancy:** organization count, applications per org, environments per application. **Cardinality:** routes, sessions, users, fingerprints, releases, endpoints. **Queries:** top 20 production queries, latency targets, dashboard/investigation concurrency. **Retention:** expiration frequency, partition size, deletion cost. **Reliability:** durability requirements, acceptable telemetry loss, queue durability, recovery targets. **Self-hosting:** single-node and multi-node requirements, backup requirements, upgrade requirements, operational complexity. **Security:** encryption, tenant isolation, audit, access controls, data residency.

No physical storage choice should be finalized until these are measured and reviewed — this checklist is the gate between this logical model and implementation in `06-engineering-specs/`.
