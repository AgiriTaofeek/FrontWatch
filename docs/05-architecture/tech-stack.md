# FrontWatch — Technology Stack

**Status:** Draft · Consolidates all of legacy `10-technology-stack/` (README, backend, backend-runtime-decision, databases, sdk, frontend, auth, streaming, cache, observability, deployment, technology-tradeoffs, local-development, cost-and-operations). Rationale for each choice lives as a proper ADR in `../decisions/`; this document is the current concrete baseline.

## Decision principle

Choose technology based on: banking/privacy requirements · self-hosting · telemetry throughput · high-cardinality investigation · query latency · reliability · operational complexity · developer experience · long-term maintainability · ability to scale from a small installation to a large bank.

## The baseline

```
Web Dashboard        TypeScript + React (+ routing layer TBD)
Control Plane        TypeScript + Bun          → apps/control-api
Data Plane           Go                        → ingestion, processing, workers
Browser SDK          TypeScript (framework-independent core + thin adapters)
Control Database     PostgreSQL
Telemetry Store      ClickHouse
Event Streaming      Redpanda
Cache/ephemeral      Valkey
Object Storage       S3-compatible
Authentication       OIDC-compatible IdP; Keycloak is the initial self-hosted candidate
Containerization     Docker (OCI)
Production orchestration  Kubernetes (Helm packaging)
Infrastructure as Code     Terraform/OpenTofu-compatible
Observability         OpenTelemetry-compatible instrumentation + Prometheus-compatible metrics
```

> This is the recommended baseline, not a claim every component is mandatory in the MVP. A small installation may skip a separate cache or stream cluster if a simpler topology measures as sufficient — see "Cost & operational complexity" below.

## Backend runtime split

Control Plane (TypeScript/Bun) and Data Plane (Go) are **independently deployable services with an explicit contract between them** — this was a real architecture pivot (see [ADR-017](../decisions/ADR-017-control-plane-bun.md), which amends [ADR-016](../decisions/ADR-016-go-data-plane.md) in `../decisions/`) and is now the single source of truth; do not describe the backend as "all Go."

**Why split by plane rather than one language for the whole backend:** the control plane is CRUD-shaped resource management with relatively low, bursty traffic — Bun/TypeScript favors developer velocity and shared typing with the dashboard here. The data plane is ingestion/worker-heavy and concurrency-bound — Go's concurrency model, low runtime overhead, and lighter deployment footprint fit that workload specifically.

```
Go (data plane)
├── Ingestion API
├── Processing Workers
├── Alert Evaluation Workers
├── Retention Workers
└── Platform Health Services
```

Organization/user/application/environment/project/release *management* is control-plane-owned (Bun); the Go data plane only *consumes* that data via the contracts in `../../06-engineering-specs/data-plane/` and `../../06-engineering-specs/control-plane/`. Go's internal package boundaries: `telemetry, issues, sessions, performance, network, alerts, privacy, search, health`.

## Databases & storage

| Store | Used for | Why |
|---|---|---|
| **PostgreSQL** | organizations, users, memberships, applications, environments, projects, releases, deployments, alert_rules, audit_records | Transactions, relational constraints, mature SQL, predictable CRUD — not the primary telemetry analytics store |
| **ClickHouse** | events, errors, network, performance, breadcrumbs | Columnar analytics, high-throughput event workloads, time-oriented querying, aggregation, high-cardinality exploration — an explicit ClickHouse use case |
| **S3-compatible object storage** | source maps, large diagnostic artifacts, archived telemetry, backups, exported reports | Large/archival artifacts only |

## SDK technology

TypeScript core (`@frontwatch/sdk-core`) + thin adapters: React → Next.js; Vue → Nuxt; Svelte → SvelteKit; plus React Router, Remix, TanStack Start, Solid, SolidStart. Core owns client, context, transport, buffering, sampling, privacy, session, errors, network, performance, navigation, breadcrumbs — adapters provide only framework lifecycle integration, routing context, framework-specific error boundaries, and SSR/client boundary handling; core behavior is never duplicated per framework. Strict budgets required for bundle size, CPU, memory, network traffic, initialization time. **SDK failure must never break the customer application** (ADR-004/005 in `../decisions/`).

**On OpenTelemetry:** considered at the data/interoperability boundary, but FrontWatch does not force the browser SDK to depend on every OTel browser component — OTel's own browser instrumentation is currently documented as experimental/mostly unspecified, so FrontWatch owns its product-critical browser instrumentation layer rather than outsourcing core behavior to an unstable abstraction.

## Frontend (dashboard) technology

TypeScript + React — chosen for the mature ecosystem around dense interactive engineering tools: charts, large tables, timelines, filters, keyboard interaction, deep links, complex investigation state, progressive data loading. The exact React framework/router is a separate, still-open implementation decision.

```
src/
├── app · routes
├── features/  {health, issues, sessions, performance, network, releases, alerts}
├── components · charts · data · state · auth · lib
```

State is separated into **server state / UI state / URL state** — investigation filters that need to be shareable live in URL state. Large telemetry lists use cursor pagination, incremental loading, virtualization where required, and aggregated queries for charts — never download huge event datasets into the browser. **The dashboard must stay usable during incidents, exactly when data volume and user activity are highest.**

## Authentication

OIDC-compatible model; Keycloak is the initial self-hosted identity-provider candidate. Must support OIDC, SAML, and local auth where required — the dashboard is never hard-coded to one identity provider. Authorization stays FrontWatch's own responsibility: `Identity Provider → who is this user? → FrontWatch → what can this user access?`. Initial roles: Administrator, Engineer, Viewer (future: custom roles, fine-grained/project-level permissions). Human authentication is strictly separated from SDK ingestion credentials and API/service credentials — **an SDK credential must never become an administrative credential.** Enterprise installations should integrate with existing identity infrastructure rather than forcing a separate identity silo.

## Event streaming

Redpanda (Kafka-API-compatible, self-managed) for durable telemetry streaming at production scale — durable buffering, replay, partitioning, consumer groups, backpressure, independent worker scaling. Flow: `Ingestion → Redpanda → Processing Workers → ClickHouse`. Conceptual topics: `telemetry.raw, telemetry.normalized, telemetry.errors, telemetry.performance, telemetry.network, telemetry.dead-letter` (exact structure to be validated by load testing). **Small installations should not require a large Redpanda cluster** — a simpler queue topology is acceptable if the operational complexity outweighs the benefit at that scale. Streaming infrastructure is justified by telemetry workload, never by wanting to "look microservice-like."

## Cache / ephemeral state

Valkey (open-source Redis-compatible) for short-lived query cache, rate-limit counters, distributed coordination, temporary session state, alert evaluation state. **Never the source of truth** — `PostgreSQL = control truth, ClickHouse = telemetry truth, Valkey = ephemeral acceleration only`. If cache fails, the dashboard gets slower, it never corrupts data. **MVP rule:** don't make Valkey a mandatory dependency for the smallest installation if the MVP can operate reliably without it — introduce it when measurement shows a clear need.

## Deployment & containerization

Docker-compatible OCI containers for packaging. Kubernetes as the production orchestration target for larger/self-hosted enterprise deployments (Helm charts for packaging). Terraform/OpenTofu-compatible IaC where applicable.

| Profile | Shape |
|---|---|
| Development | Docker Compose — one-command local environment, low operational complexity |
| Small production | Single Kubernetes node or VM-based container deployment, depending on customer requirements |
| Enterprise | Kubernetes cluster → Load Balancer → FrontWatch services → Redpanda → ClickHouse → PostgreSQL → Object Storage |

Upgrade strategy: versioned images, database migrations, configuration versioning, rolling upgrades where safe, documented rollback.

## Local development

Target: `git clone → configure → one command → full local environment`, via Docker Compose. **Minimal mode:** web, api, ingestion, worker, postgres, clickhouse, **redpanda**. Redpanda is included even in minimal mode — the async-ingestion architecture (ADR-004) puts a durable queue between ingestion and processing on the golden path itself (`02-product/mvp.md` §1), so a local environment without it wouldn't actually exercise the real flow. **Full mode** adds: valkey, object storage emulator, identity provider, observability stack — these are genuinely deferrable because nothing on the MVP golden path depends on them (see the MVP dependency rule in §Cost & operational complexity below). A telemetry generator (producing errors, sessions, network failures, performance regressions, releases, deployment events) is planned as essential tooling for developing and benchmarking the investigation UI.

## FrontWatch's own observability stack

OpenTelemetry-compatible instrumentation for FrontWatch's own backend services where practical; the collector layer can use an OTel-compatible pipeline (Grafana Alloy is one current self-hosted option, kept as a swappable choice, not a hard dependency). Platform metrics to expose: ingestion (requests/sec, events/sec, rejected events, latency, payload sizes), queue (depth, consumer lag, throughput, dead-letter volume), workers (latency, errors, retries, CPU, memory), ClickHouse (query/insert latency, failed queries, storage usage), PostgreSQL (connection pool, query latency, locks, replication/backup health), API (latency, error rate, saturation). See `system-architecture.md` §14 for the golden rule this serves.

## Technology tradeoffs considered

| Choice | vs. | Decision & why |
|---|---|---|
| PostgreSQL | ClickHouse | Use both for their strengths — Postgres for transactional control-plane CRUD, ClickHouse for analytical high-cardinality telemetry; neither replaces the other |
| Redpanda | RabbitMQ | Redpanda for the telemetry stream — stream/replay/partition semantics and Kafka compatibility beat RabbitMQ's excellent-but-different task/message routing model for this workload |
| Kubernetes | Docker Compose | Compose for local development (simplicity, DX), Kubernetes for enterprise production (scaling, orchestration, declarative infra) |
| Go (data plane) | TypeScript backend | Go for the data plane (concurrency, operational simplicity, low overhead); TypeScript stays for the browser SDK, dashboard, **and now also the control plane** (see the runtime-split section above — this tradeoff note predates ADR-017 and should be read alongside it, not as "Go for everything") |
| OpenTelemetry | Custom FrontWatch protocol | Use OTel concepts/interoperability where useful, but keep a first-class FrontWatch event model and SDK — the product must not be constrained by gaps in generic browser instrumentation |

## Cost & operational complexity

Principle: self-hosted does not mean "everything must run all the time" — every infrastructure dependency has CPU/memory/storage/backup/upgrade cost and security responsibility, so a component becomes mandatory only when it provides clear value.

**Core mandatory:** PostgreSQL, ClickHouse, FrontWatch API, FrontWatch ingestion, FrontWatch workers. **Scale-up components** (some become mandatory at enterprise scale): Redpanda, Valkey, Kubernetes, object storage, dedicated collectors. **Small-installation goal:** a small team runs FrontWatch without operating a large distributed cluster. **Enterprise goal:** a bank scales ingestion, workers, ClickHouse, and API independently — without scaling everything equally just because one component is under load.
