# FrontWatch — Release & Launch

**Status:** Draft · Consolidates the remaining parts of legacy `19-release-and-launch/` not already covered by `../02-product/mvp.md` and `../02-product/roadmap.md` §3 (installation-guide, production-readiness, release-strategy, support-model, upgrade-guide, customer-onboarding, launch-checklist, deployment-checklist, release-acceptance, launch-risks)

## Release channels & criteria

Channels: **canary** (internal + highly technical early adopters) → **beta** (selected pilot customers) → **stable** (general customer use). Semantic versioning where practical. A release requires: quality gates (`../07-delivery/test-strategy.md`), security review, migration validation, operational readiness, known-risk review, rollback plan. Every release artifact identifies its version, commit, container images, SDK versions, and database migration.

## Installation

Goal: a customer's DevOps engineer installs FrontWatch without an FrontWatch engineer on the call. Document required inputs: domain/hostname, TLS, identity provider, storage, database, queue, object storage, resource profile. Installation paths: local Docker, single-node deployment, Kubernetes/Helm, enterprise deployment (matching the profiles in `infrastructure.md` §2). Verification sequence after install: open dashboard → login → create application → create environment → obtain SDK credential → send test event → verify event — this is the installation-side half of the onboarding workflow in `../04-ux-ui/workflows/onboarding.md`. Document common failure points: DNS, TLS, identity, ingestion, queue, storage, permissions.

## Customer onboarding journey

`Contract/approval → Infrastructure preparation → Installation → Identity configuration → Application registration → SDK installation → Source maps → Privacy configuration → Alert configuration → Validation → Go-live`. Track time-to-value: installation time, time to first telemetry, time to first detected issue. Before go-live, the customer team should explicitly know: who administers FrontWatch, who receives alerts, where data is stored, how upgrades happen, how backups work, how support is contacted.

## Upgrades (customer-facing)

Before: read release notes, check the supported upgrade path, back up, check storage, check compatibility. During: deploy new version → run migrations → validate services → validate ingestion → validate dashboard. After: verify telemetry, queries, alerts, source maps, audit logs. Rollback is documented separately for application rollback, configuration rollback, and database recovery. Document supported combinations of server, SDK, event schema, and database versions explicitly — not just "latest is supported."

## Support model

Levels: documentation, standard support, priority support, enterprise support (exact commercial tiers defined separately from this doc). Intake captures version, deployment model, environment, symptoms, logs, request ID, recent changes. **Security reports get a dedicated process, separate from ordinary product support.** Escalation path: support → engineering → security → infrastructure. For self-hosted customers, support must distinguish an FrontWatch software problem from a customer infrastructure problem — the same distinction `infrastructure.md`'s disaster-recovery section draws for responsibility boundaries.

## Production readiness & release acceptance

**A release is accepted only when evidence supports production use** — not when it merely compiles and passes CI.

| Dimension | Evidence required |
|---|---|
| Functional | Core user stories pass, critical workflows pass |
| Reliability | SLOs defined, failure tests pass, backup/restore validated |
| Security | Critical findings resolved, tenant isolation verified, security tests pass |
| Performance | SDK budget passes, dashboard budget passes, backend/load targets pass |
| Operations | Alerts, runbooks, on-call, deployment, rollback all in place |
| Documentation | Installation, upgrade, SDK, security, troubleshooting guides exist |

Final record captures release version, test evidence, known limitations, approval, and rollback version. **No production launch depends on undocumented tribal knowledge** — if it's not written down, it's not ready.

## Deployment checklist (per deploy, not just at launch)

Before: backup, verify version, verify configuration, verify storage capacity, verify migrations, verify certificates, verify secrets. Deploy: deploy artifact → run migrations → start workloads → wait for readiness. Validate: API health, dashboard, ingestion, queue, workers, database, ClickHouse, alerts. Post-deploy: compare error rate, latency, ingestion, queue lag, and storage against baseline. If critical health conditions fail, follow the documented rollback procedure immediately rather than "wait and see."

## Launch checklist

Product: MVP validated, critical UX complete, documentation ready. Engineering: tests pass, security review complete, performance validated, release artifact verified. Infrastructure: deployment tested, backup tested, restore tested, monitoring active. Operations: on-call ready, runbooks ready, support ready, incident process ready. Customer: installation/upgrade/SDK/security/troubleshooting docs. **Launch decision is recorded explicitly** as go / go-with-known-limitations / no-go, with named owners and evidence — not an implicit "I guess we're shipping."

## Launch risks

| Risk | Mitigation |
|---|---|
| Installation too difficult | Deployment profiles, automated preflight checks, excellent documentation |
| Telemetry is not trusted | Correctness testing (`../07-delivery/test-strategy.md` §Data correctness), pilot validation, transparent data freshness |
| SDK causes application problems | Performance budgets, compatibility matrix, failure isolation (ADR-006) |
| Production incident during launch | On-call, runbooks, rollback, internal observability (`observability.md`) |
| Security gap | Security gates, penetration testing, vulnerability response (`security-hardening.md`) |
| Scope creep | Explicit MVP and release criteria (`../02-product/mvp.md`) |
| Customer cannot upgrade | Compatibility windows, migration tooling, tested upgrade paths |
