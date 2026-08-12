# FrontWatch — Infrastructure

**Status:** Draft · Consolidates all of legacy `15-infrastructure-and-devops/` (README, deployment-models, containerization, backups-and-restore, disaster-recovery, scaling, secrets, security-hardening, tls-and-certificates, upgrade-strategy, resource-sizing, capacity-and-cost, storage, ci-cd/*, kubernetes/*, devops-risks, operational-runbooks, incident-response)

FrontWatch is self-hosted for regulated/banking environments, so **infrastructure is part of the product**, not an afterthought bolted on after the software is built.

## Deployment flow & topology

```
Source Control → CI/CD → Build/Test/Scan → Immutable Artifacts → Customer Infrastructure → Kubernetes/VM → FrontWatch
```

```
Users/Browser SDK → Load Balancer → Ingress
  → {Web/API, Ingestion → Redpanda → Workers → {PostgreSQL, ClickHouse, Object Storage}}
```

Environments: local, development, staging, production. Principles: reproducible infrastructure · no secrets in source control · telemetry stays inside the customer deployment · explicit health checks · tested backups and restores · documented upgrade/rollback · small installations remain simple.

## Deployment profiles

| Profile | Shape |
|---|---|
| A — Local | Docker Compose for development, testing, demos |
| B — Small self-hosted | Single VM or small Kubernetes deployment, for pilots/smaller teams |
| C — Production | Kubernetes, horizontally scalable stateless workloads |
| D — Enterprise banking | Adds private networks, internal load balancers, enterprise identity, customer certificates, private registries, HA, strict network policies, centralized logging, backup/DR, customer-managed storage |

All profiles share the same logical product architecture (`../05-architecture/system-architecture.md`) — only topology and capacity differ.

## Containerization

Each executable (web, api, ingestion, worker, alert-worker, retention-worker) packaged as an OCI image: minimal base, non-root where practical, only required binaries, deterministic builds, health endpoints exposed, immutable version tags (`frontwatch-api:1.4.2` or `:<git-sha>`, never `:latest`). CI scans images for OS/dependency vulnerabilities and embedded secrets. Runtime configures CPU/memory requests+limits, readiness/liveness probes, graceful shutdown (see `../06-engineering-specs/data-plane/operations.md` §Graceful shutdown for the service-level behavior this triggers).

## Kubernetes

Workloads: web, api, ingestion, worker, alert-worker, retention-worker (stateless, scale horizontally). Stateful systems (PostgreSQL, ClickHouse, Redpanda, object storage) may run in-cluster or on customer-managed infrastructure — enterprise installations may use specialized operators or externally-operated infrastructure. **Only Web/API and Ingestion are normally exposed** — databases and queues stay private, deny-by-default network policy with explicit allow rules. Production scheduling defines resource requests/limits, disruption budgets, anti-affinity where required. Enterprise networking supports private endpoints, internal DNS, restricted egress, and customer network controls.

## CI/CD

**CI (every PR):** checkout → dependency restore → lint → unit tests → integration tests → contract tests → security scans → build → container build → artifact validation. Go: format, vet, lint, tests, race tests. Frontend: typecheck, lint, tests, production build. SDK: additionally browser/framework compatibility and bundle/performance checks. Required checks block merges.

**Release pipeline:** `Git tag → Build → Test → Security scan → Immutable images → Publish artifacts → Release metadata → Staging → Smoke tests → Promotion`. **Promote the same built artifact rather than rebuilding** — every artifact maps to a source commit, its tests, and its dependency versions. Maintain a known-good rollback version at all times.

**Environments:** local (developer-controlled) → development (fast feedback, continuous deployment) → staging (production-like enough to catch integration problems) → production (explicit promotion/approval per customer policy). Environment configuration never requires source-code changes. Migrations are validated before production; application rollback and database rollback are separate, independently designed concerns.

**Supply chain security:** dependency scanning, container scanning, secret scanning, SBOM generation, artifact signing where practical, protected branches/release tags, least-privilege CI credentials unavailable to untrusted PRs. Customers should be able to verify exactly which release artifact they deployed.

## Backups, DR & upgrades

**Backups:** back up PostgreSQL, configuration, alert definitions, identity/configuration metadata, source maps where required — telemetry backup policy depends on retention/durability requirements. **A backup is not valid until restoration has been tested**: backup → isolated environment → restore → integrity checks → application validation. Define RPO (max acceptable data loss) and RTO (max acceptable recovery time) per customer deployment tier.

**Disaster recovery scenarios to plan for:** node failure, database failure, storage failure, queue failure, bad deployment, accidental deletion, credential compromise, cluster loss, AZ failure. Recovery sequence: detect → declare recovery mode → restore infrastructure → restore control data → restore telemetry per policy → start services → validate ingestion → validate queries → validate alerts. Customer documentation must clearly distinguish FrontWatch's responsibilities from the customer's own infrastructure responsibilities. Run recovery exercises periodically, not only when something has already gone wrong.

**Upgrades:** `backup → preflight checks → database migration → deploy → health validation → post-upgrade checks`. Preflight checks the supported upgrade path, storage capacity, database version, configuration compatibility, infrastructure requirements. Prefer additive migrations before destructive ones. Document application rollback, data migration rollback, and configuration rollback as separate procedures. Maintain compatibility across SDK, API, event schema, database schema, and worker versions simultaneously — self-hosted customers upgrade on their own schedule, not FrontWatch's.

## Sizing, capacity & storage

Sizing is benchmark-driven, not guessed: `daily raw bytes ≈ events/day × average event size`, then account for compression, indexes, replication, derived data, overhead. Benchmark procedure: generate representative telemetry → measure ingestion → measure processing → measure queries → measure storage growth → apply peak traffic → test recovery. Build deployment profiles from measured ranges, not one universal machine size.

Main capacity cost drivers: telemetry volume, retention, replication, query concurrency, storage performance, cluster size — **telemetry storage will often dominate infrastructure cost**; sampling controls both load and cost, but critical-error visibility must remain strong regardless (see `../06-engineering-specs/sdk/privacy-and-security.md` §Sampling).

PostgreSQL needs persistent storage, backup/restore, and an HA strategy for critical installations. ClickHouse needs persistent storage, capacity planning, retention, backup strategy, and replication at scale. Redpanda needs durable disks with configured replication/retention. Object storage covers source maps, large artifacts, archival objects, and backups.

## Secrets & security hardening

Secrets (database credentials, OIDC secrets, signing keys, webhook secrets, encryption keys, TLS private keys, registry credentials) are never stored in Git, images, or browser bundles. Support Kubernetes Secrets and external secret managers (Vault, cloud secret managers, enterprise secret platforms). Every secret type has a documented rotation procedure; logs never contain secret values. Browser-visible ingestion credentials are intentionally limited and are **not** administrative secrets.

Network: private databases, explicit network policies, restricted ingress/egress. Containers: non-root, minimal images, vulnerability scanning, immutable tags. Kubernetes: RBAC, pod security controls, network policies, resource limits, audit logging where required. Storage: encryption at rest, restricted access. Supply chain: verify source, dependencies, images, deployment artifacts. Administrative access follows least privilege and is auditable.

**TLS:** all production external traffic uses TLS; support customer-provided certificates, enterprise CAs, and automated certificate management where permitted. Certificate rotation avoids unnecessary downtime. The browser ingestion endpoint is always HTTPS — any trusted internal HTTP exception is explicitly documented, never a silent default.

## Operational runbooks & incident response

Ship runbooks for: API unhealthy, ingestion unavailable, queue lagging, worker crash loop, ClickHouse/PostgreSQL unavailable, storage full, certificate expiring, backup failed, deployment failed, rollback, telemetry volume spike, security incident. Structure: symptoms → impact → checks → mitigation → recovery → verification → escalation. **Runbooks must be usable by a customer's own DevOps/SRE team without an FrontWatch engineer on the call**, and tested by someone who didn't author them.

Infrastructure incident lifecycle: detect → triage → contain → investigate → recover → validate → postmortem. Key scenarios: ingestion down (customer apps keep working; monitoring data may be lost), dashboard down (telemetry may keep flowing; investigation is unavailable), storage unavailable (workers buffer through the queue per available capacity). Postmortems record timeline, impact, root cause, contributing factors, detection, remediation, prevention.

## Infrastructure & DevOps risks

| Risk | Mitigation |
|---|---|
| Self-hosting too complex for target customers | Deployment profiles, Helm, simple local stack, strong documentation |
| Data loss | Durable queues, backups, replication, restore testing |
| Storage exhaustion | Capacity alerts, retention, quotas, forecasting |
| Unsafe upgrades | Preflight checks, migration strategy, rollback, compatibility windows |
| Supply-chain compromise | Traceable artifacts, scanning, SBOM, protected CI |
| FrontWatch outage affects the customer application | SDK isolation, bounded retries, asynchronous ingestion (ADR-006) |
| Infrastructure itself is unobservable | Independent monitoring, metrics, logs, traces, health checks — see `observability.md` |
