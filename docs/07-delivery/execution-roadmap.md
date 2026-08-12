# FrontWatch — Engineering Delivery Roadmap

**Status:** Draft · Consolidates: legacy `21-engineering-tasks/critical-path.md`, `mvp-execution-board.md`, `release-milestones.md`, `post-mvp-roadmap.md`, `roadmap-governance.md`, `parallel-workstreams.md`. This is the execution-phase view; `../02-product/roadmap.md` covers the product/pilot-facing milestones (M0–M6) and `../01-project/strategy.md` §7 covers the long-term capability roadmap. One canonical copy — the legacy docs had this duplicated near-verbatim across `20-engineering-roadmap/` and `21-engineering-tasks/`; this file merges them.

## Critical path

```
E01 Foundation → E02 Control Plane → E03 SDK → E04 Ingestion → E05 Processing
   → E06 Storage → E07 Query API → E08 Dashboard
```

First vertical slice: `capture JS error → ingest → queue → process → store → fingerprint/group → query → display`. Then expand into session, network, performance, release, and alerts — same slice as `../02-product/mvp.md` §1.

## Execution phases

| Phase | Epics | Outcome |
|---|---|---|
| 0 — Foundation | E01 | Repos, build system, local env, CI |
| 1 — First telemetry | E02, E03, E04, E05 | SDK → ingestion → queue → storage; a test event becomes queryable |
| 2 — First investigation | E07, E08 | Health → issue → occurrence; an engineer can detect and inspect an error |
| 3 — Context | Sessions, network, performance, releases | An issue can be investigated with surrounding evidence |
| 4 — Production hardening | E09, E10, E11, E12 | Security, RBAC, tenant isolation, load, failure recovery, backups |
| 5 — Pilot | — | Deploy to a real, controlled customer application |

At every phase, prioritize work that advances the *next* exit criterion, not whatever looks interesting.

## Parallel workstreams (once contracts and core boundaries are stable)

Control Plane (Bun, PostgreSQL, auth, RBAC, applications) · Data Plane (Go, ingestion, Redpanda, processing, ClickHouse) · SDK (capture, privacy, transport, compatibility) · Frontend (shell, health, issues, investigation) · Infrastructure (containers, Kubernetes, CI/CD, backup, observability) · Quality/Security (contracts, E2E, load, security, tenant isolation). Parallelism starts only after the contracts and core boundaries in `../06-engineering-specs/README.md` are stable — not before, or the streams drift.

## Release milestones

| Milestone | Content |
|---|---|
| **R0 — Internal Alpha** | Local deployment, first telemetry, basic issue investigation |
| **R1 — Engineering Alpha** | SDK, ingestion, storage, dashboard, sessions, performance, network |
| **R2 — Internal Production** | Security, RBAC, tenant isolation, backups, monitoring, alerts |
| **R3 — Pilot** | Real customer installation, production-like workload |
| **R4 — Beta** | Upgrade path, support, load, failure recovery |
| **R5 — GA** | Stable, documented, supportable production release |

## Post-MVP phases

| Phase | Focus |
|---|---|
| 2 — Intelligence | Regression detection, anomaly detection, release health scoring, correlations |
| 3 — Collaboration | Assignments, comments, incident workflows, Slack/Teams integrations |
| 4 — Customization | Custom dashboards, custom metrics, advanced query builder |
| 5 — Enterprise | Advanced RBAC, SCIM, SAML/OIDC expansion, customer-managed keys, multi-region options, advanced audit |
| 6 — Platform | Integrations, extensibility, plugins, automation APIs |

Maps onto the capability-maturity stages (V1–V3, Enterprise) in `../01-project/strategy.md` §7 — this is the execution-sequenced version of the same evolution.

## Roadmap governance

**Inputs considered:** customer incidents, pilot feedback, support, product analytics, security findings, performance data, engineering constraints. **Prioritized by:** customer value, strategic value, risk reduction, revenue opportunity, effort, dependencies. Every major roadmap decision is recorded with decision, reason, evidence, impact, date, and owner — so "why did we reprioritize this" has an answer six months later instead of relying on memory.
