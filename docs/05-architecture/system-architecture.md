# FrontWatch — System Architecture

**Status:** Draft · Consolidates: `08-architecture/README.md`, `system-context.md`, `component-architecture.md`, `system-architecture.md`, `ingestion-architecture.md`, `processing-architecture.md`, `query-architecture.md`, `api-architecture.md`, `reliability-architecture.md`, `scalability-architecture.md`, `self-hosted-architecture.md` + `self-hosted-deployment.md`, `observability-of-frontwatch.md`, `architecture-decisions.md`, `architecture-risks.md`

## 1. Architecture goals

FrontWatch must: capture frontend telemetry reliably · minimize SDK impact on customer applications · protect sensitive banking/customer data · support multiple frontend frameworks and rendering modes · process high-volume telemetry · support fast investigation queries · correlate errors, sessions, network, performance, and releases · remain self-hostable · fail safely without affecting monitored applications · monitor itself.

## 2. Core architecture (golden event path)

```
Customer Application → FrontWatch SDK → [Filter → Redact] → Sampling → Transport
   → Ingestion/Edge → Validation → Event Pipeline [Normalize → Enrich → Route]
   → Storage [Raw | Derived | Aggregates] → Query API → FrontWatch Web UI
```

Expanded, with the queue made explicit: `Browser → SDK → Ingestion → Durable queue → Worker → Normalize → Privacy enforcement → Fingerprint → Persist → Aggregate → Query → Dashboard`. **The customer application never waits for the processing pipeline** — ingestion acknowledges after durable handoff, not after processing (see [ADR-004](../decisions/ADR-004-async-telemetry-processing.md)).

## 3. Architecture philosophy

**Start modular, not prematurely distributed.** The MVP uses strong internal boundaries without forcing every boundary into a networked microservice — a modular backend plus an asynchronous telemetry pipeline (ADR-001). This gives simpler local development, fewer operational failure modes, clear domain ownership, an easier path to extract services later, and less infrastructure burden for self-hosted customers. **A module becomes a service when:** it has materially different scaling requirements, needs independent deployment, creates operational contention, or has a clear ownership boundary — not merely because a domain exists.

**Separate control plane from telemetry plane** (ADR-002) — this is fundamental to how FrontWatch scales:

| | Control Plane | Telemetry Plane |
|---|---|---|
| Contains | Organizations, Users, Applications, Environments, Releases, Configuration, Alert Rules, Permissions | Ingestion, Processing, Events, Issues, Sessions, Performance, Network, Aggregates |
| Workload | Transactional, lower volume, relational | High volume, append-oriented, time-oriented, analytics-heavy |
| Consistency | Strongly consistent | Eventually consistent (acceptable) |

## 4. Major components

| Component | Responsible for |
|---|---|
| **Browser SDK** | Instrumentation, event capture, privacy filtering, redaction, sampling, batching, transport, local buffering. Must never depend on the FrontWatch dashboard being available. |
| **Ingestion layer** | Accepting telemetry, authenticating project identity, validating payloads, enforcing limits, rate limiting, accepting batches, fast acknowledgement. Avoids expensive synchronous processing. |
| **Event pipeline (workers)** | Normalization, enrichment, event classification, fingerprint generation, issue grouping, aggregation, routing to storage. |
| **Control Plane API** | Authentication, organizations, users, applications, environments, releases, configuration, alerts, permissions. |
| **Query layer** | Issue/session/event/performance/network queries, release comparisons, dashboard aggregates. |
| **Storage** | Different engines for control data, high-volume telemetry, aggregated metrics, search/index data, long-term objects — not forced into one system. |
| **Web application** | Dashboards, issue/session/performance/release investigation, configuration. |

## 5. Repository/component shape (conceptual, not final layout)

```
apps/        web · api · ingestion · workers
packages/    sdk-core · sdk-react · sdk-next · sdk-vue · sdk-svelte · sdk-solid ·
             event-schema · domain · privacy · config · observability
```

**Backend modules** (can live in one deployable backend initially, clean boundaries preserved): identity, organizations, applications, environments, projects, releases, telemetry, issues, sessions, performance, network, alerts, privacy, search, health.

**Worker modules** (can begin in one worker process, split later if load requires it): event-normalizer, event-enricher, error-fingerprinter, issue-processor, metric-aggregator, retention-worker.

**SDK shape:** `sdk-core` (event creation, context management, sampling, redaction, buffering, transport, error capture, session management) with thin adapters for React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart, Remix, React Router, TanStack Start. See `06-engineering-specs/sdk/`.

## 6. Synchronous vs. asynchronous work

**Keep synchronous:** authentication, project lookup, application configuration, simple control-plane CRUD, ingestion acknowledgement. **Move off the request path:** parsing, enrichment, fingerprinting, aggregation, issue grouping, metric computation, indexing, retention cleanup.

## 7. Ingestion architecture

Flow: `SDK → HTTPS → Load Balancer/Edge → Ingestion API → basic validation → auth/project resolution → durable queue → 202/success ack`. **Why queue before processing:** without a durable buffer, a storage or processing slowdown directly causes ingestion failures; with a queue, ingestion absorbs temporary downstream problems instead of failing.

Requirements: the ingestion credential identifies the destination project and must **never** grant dashboard privileges · payload limits on request size, event count per batch, field size, nesting depth, metadata · rate limits at organization, application/project, source-credential, and (where useful) IP level · backpressure — when downstream capacity is constrained, the queue grows and workers catch up, rather than making browser requests perform expensive retries · SDK retries must be bounded — no retry storms during a FrontWatch outage.

**Failure principle:** if ingestion is unavailable, the customer application keeps working. Monitoring loss is preferable to application failure.

## 8. Processing architecture

Pipeline: `Queue → Decode → Validate → Normalize → Privacy enforcement → Enrich → Fingerprint → Correlate → Persist → Aggregate`.

- **Normalize** — convert framework/browser-specific representations (React error, Next.js error, Vue error, Svelte error...) into one common event model.
- **Enrich** — add safely-derivable context: normalized route, release metadata, environment metadata, browser family, device category, geographic metadata only if explicitly enabled.
- **Fingerprint** — generate stable identities for grouping (many error events → one fingerprint → one issue).
- **Correlate** — surface relationships (error↔network failure, error↔session, error↔release, performance regression↔release) while staying explainable, never asserted as certainty.
- **Idempotency** — a worker may process the same message more than once; writes must be idempotent or deduplicated where correctness requires it.
- **Dead-letter handling** — events that repeatedly fail processing are isolated to a dead-letter path that stays observable and recoverable, not silently dropped.

## 9. Query architecture

Query categories: **overview** (current error rate, active issues, health, performance trend, latest deployment) · **investigation** (issue occurrences, affected sessions, breadcrumbs, network activity, release correlation) · **analytical** (performance by route, errors by browser, release comparison, error trends).

Principle: the UI never understands raw storage layout — `Web App → Query API → domain query → storage adapter → telemetry store`. The Query API owns authorization, tenant isolation, validation, pagination, filtering, aggregation, and result shaping. An issue investigation page needs issue metadata + trend + top affected routes/releases + affected sessions + network evidence + performance evidence in one coherent view — the query architecture should avoid forcing 7 sequential high-latency requests to assemble it. Use cursor pagination for large telemetry collections (avoid offset pagination). Protect against expensive arbitrary queries via time-window limits, max result sizes, timeouts, rate limits, and complexity limits. Cache carefully — good candidates are stable control-plane metadata, common dashboard aggregates, release metadata; never cache sensitive investigation results beyond policy.

## 10. API architecture

Domains: `/auth /organizations /applications /environments /releases /deployments /issues /sessions /events /performance /network /alerts /settings`. Full contract detail lives in `api-contracts.md`.

Principles: resource-oriented with stable identities · tenant-aware (authorization on every protected resource) · versioned for evolution · paginated for large collections · idempotent where retries are expected · consistent, machine-readable errors. **The public telemetry ingestion API and the authenticated console API are architecturally separate concerns** — different traffic patterns, authentication models, latency requirements, failure modes, and scaling characteristics. Don't combine them just because both use HTTP.

## 11. Reliability architecture

FrontWatch fails independently of the applications it monitors, at every boundary: `SDK → Network → Ingestion → Queue → Workers → Storage → Query API → Dashboard`.

| Boundary | Expected failure behavior |
|---|---|
| SDK | FrontWatch unavailable → application continues. Fail silently where appropriate, bound memory, bound retries, never block critical application work. |
| Ingestion | SDK retries within bounded limits — no infinite retry loops. |
| Queue | Ingestion fails fast/safely rather than blocking the browser request. |
| Worker | Messages stay recoverable via durable queue semantics. |
| Storage | Workers retry per bounded policy and isolate poison messages. |
| Query | Dashboard says "unable to load telemetry" — never presents misleading zeros. |

**Partial data must be distinguishable:** no data / partial data / stale data / query failed / healthy-with-zero-events are five different states, not one. Self-hosted deployments need a defined backup policy, recovery objectives, restore procedure, telemetry-durability expectations, and control-plane recovery procedure (detail in `08-operations-release/`).

## 12. Scalability architecture

Scale across organizations, applications, browser sessions, telemetry events, errors, network requests, performance samples, and concurrent queries — primarily via **horizontal scaling of stateless components** (multiple ingestion instances behind a load balancer; workers scaling independently off the queue).

**Partitioning:** telemetry partitioning strategy driven by actual access patterns — candidates are time, tenant/application, event category; avoid prematurely partitioning on volatile/high-cardinality identifiers without evidence. **Cardinality:** URLs, session IDs, user IDs, and error fingerprints are naturally high-cardinality — the architecture must distinguish dimensions worth indexing from values better left as payload. **Backpressure is the core scaling mechanism under a traffic spike:** ingestion stays lightweight → queue absorbs the burst → workers scale → backlog drains. **Query scalability:** dashboard queries use pre-aggregated/indexed structures where appropriate, not raw scans.

**Self-hosted reality the architecture must support both ends of:** a small installation on a single node/small cluster, and a large bank on a multi-node horizontally scaled deployment — without forcing the smallest customer to operate a huge distributed system.

## 13. Self-hosted deployment architecture

Goal: a customer runs the complete platform inside infrastructure they control, and **the self-hosted installation must not depend on an external FrontWatch SaaS control plane to process customer telemetry.**

```
Customer Network
├── FrontWatch Web/API
├── Ingestion → Queue → Workers
└── Control DB · Telemetry Store · Object Store
```

**Deployment profiles:**
- **Small/evaluation** — Web/API, Worker, Database, Telemetry Store, single-node friendly.
- **Production** — Load Balancer → {API, Ingestion → Queue → Workers} → Storage, with horizontal scaling.
- **Enterprise** — separated components, stronger isolation, customer-managed infrastructure, integration with enterprise identity/operations.

Configuration must be externalized: database connection, telemetry storage, queue, object storage, authentication, retention, encryption, organization defaults, resource limits, logging, secrets. Upgrades must account for schema migrations, rolling upgrades where possible, worker/event-schema compatibility, and rollback (see `09-data-model.md` §6 and `08-operations-release/`). **Data residency:** self-hosted customers retain control over where telemetry is physically stored, and it stays inside the deployment boundary unless the customer explicitly chooses otherwise.

## 14. FrontWatch's own observability

FrontWatch must monitor itself — see `01-project/charter.md` Principle 6. Core signals to expose:

| Layer | Signals |
|---|---|
| Ingestion | events received, rejected events, bytes received, ingestion latency, rate-limit events |
| Queue | queue depth, consumer lag, processing throughput, dead-letter volume |
| Workers | processing latency, errors, retries, CPU, memory |
| Storage | write/read latency, capacity, errors |
| Query/API | request count, latency, error rate, slow queries, status codes, auth failures |
| SDK delivery | accepted events, rejected events, delivery failures |

**Golden rule:** if FrontWatch cannot tell whether FrontWatch itself is healthy, the product is not ready to be trusted — a platform that breaks and still reports "everything is healthy" defeats the entire purpose. Internal dashboard should answer: is ingestion healthy? are events being dropped? is processing behind? is storage healthy? are queries slow? are customers affected?

## 15. Trust boundaries

| Boundary | Nature | Must enforce |
|---|---|---|
| **1 — Browser** | Untrusted. Users can inspect requests, modify JS, network can fail, browser APIs vary. | SDK assumes hostile environment |
| **2 — Ingestion** | Internet- or customer-network-facing. | Authentication/identification, payload validation, rate limits, size limits, abuse protection |
| **3 — Internal platform** | Trusted service-to-service, but still authenticated/authorized | Auth on every internal call |
| **4 — Customer data** | Telemetry belongs to the organization | Strict tenant isolation |

## 16. Open architecture decisions (deferred, not yet chosen at this layer)

Primary relational database, telemetry database, message broker/queue, cache, object storage, orchestration platform, exact API protocol, deployment packaging, exact SDK/frontend framework choices are resolved as concrete ADRs in `tech-stack.md` + `decisions/` — this document stays at the conceptual layer intentionally so the shape survives a specific technology swap.

## 17. Architecture risks

| Risk | Mitigation |
|---|---|
| Telemetry volume dwarfs control-plane volume | Separate telemetry plane, queues, horizontal workers, efficient telemetry storage |
| High cardinality (session IDs, URLs, users, fingerprints) makes indexes expensive | Deliberate dimension modeling, benchmark actual query patterns |
| Self-hosted complexity exceeds what customers can operate | Deployment profiles, start modular, no mandatory large cluster for small installs |
| SDK performance harms the monitored application | Strict SDK budgets, async processing, sampling, continuous benchmarking |
| Privacy leakage — sensitive banking data enters telemetry | Privacy-by-default, early redaction, field classification, auditability |
| Query latency — raw telemetry queries become expensive | Derived indexes, aggregates, query limits, purpose-built storage |
| Event schema evolution — SDKs and backend deploy independently | Explicit event schema versions and compatibility rules |
| False correlation presented as causation | Distinguish observed facts / correlations / hypotheses in the product model itself |
| Data loss from queue/worker/storage failure | Durable queues, retries, idempotency, dead-letter handling, operational metrics |
| FrontWatch becomes a single point of failure customers over-rely on | Graceful degradation, independent customer-app execution, HA where required |
