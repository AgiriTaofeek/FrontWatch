# FrontWatch — Delivery Roadmap

**Status:** Draft · Consolidates: milestones, implementation-order, beta-strategy, pilot-program (legacy `20-engineering-roadmap/` + `19-release-and-launch/`)

For the long-term capability-maturity roadmap (MVP → V1 → V2 → V3 → Enterprise → Long-term), see `01-project/strategy.md` §7. This document is the near-term execution path: milestones, build order, and how the MVP gets validated with a real pilot customer.

## 1. Milestones

| Milestone | Outcome |
|---|---|
| **M0 — Architecture Foundation** | Repositories, build system, local environment, CI, coding standards, observability foundation in place |
| **M1 — First Telemetry** | SDK → ingestion → queue → storage; a test frontend event becomes queryable |
| **M2 — First Investigation** | Health → issue → occurrence; an engineer can detect and inspect a frontend error |
| **M3 — Operational Context** | Session, network, performance, release context attached; an issue can be investigated with surrounding evidence |
| **M4 — Production Hardening** | Security, RBAC, tenant isolation, load testing, failure recovery, backups |
| **M5 — Pilot Ready** | Installable, documented, observable, supportable |
| **M6 — General Availability** | Stable release, upgrade path, support model, production SLOs |

## 2. Build order

1. **Repository & local platform** — monorepo, local dependencies, CI, configuration, logging, metrics.
2. **Control plane** — organization, user, application, environment, project, release.
3. **SDK skeleton** — initialization, configuration, transport, batching, privacy.
4. **Ingestion** — authentication, validation, rate limits, queue publishing.
5. **Processing** — normalization, fingerprinting, enrichment, ClickHouse writes.
6. **Error investigation** — issue grouping, issue API, issue UI, occurrence details. *(M1/M2 land here — this is the first vertical slice from `mvp.md` §1.)*
7. **Context** — session, network, performance, release.
8. **Operations** — alerts, SLOs, internal dashboards, backup/restore/upgrade.
9. **Hardening** — security, load, failure, compatibility, DR testing.
10. **Pilot** — deploy to a real, controlled customer environment.

This order is deliberate: control plane and SDK skeleton exist only to support the error-investigation slice (step 6) as fast as possible — context, operations, and hardening are layered on *after* that slice works end to end, not before.

## 3. Beta / pilot validation

**What the beta must validate:** product usefulness, deployment experience, telemetry correctness, operational reliability, performance, security assumptions.

**Pilot customer selection criteria:** a real frontend application, a strong engineering team, clear existing monitoring pain, willingness to give feedback, and infrastructure suitable for self-hosting. Start with one application/environment, not a full rollout.

**Pilot phases:** technical onboarding → telemetry validation → operational observation → real incident usage → feedback → stabilization.

**Pilot readiness checklist:** installation successful, SDK installed, source maps configured, data visible, privacy rules configured, alerts configured, backup configured.

**What to measure:** time to install, time to first telemetry, bugs detected before customers report them, time to investigate incidents, dashboard usage, SDK overhead, deployment reliability.

**Feedback triage** (don't let every request become MVP scope): separate into bug / usability issue / missing critical capability / nice-to-have. Only the first two categories block pilot exit by default.

**Exit criteria to move toward GA:** critical bugs resolved, deployment is repeatable, telemetry is trustworthy, security baseline satisfied, support process ready.

## 4. Framework adoption sequencing

MVP ships with **Tier 1 only — React, React Router, and TanStack Start** (`mvp.md` §5; React ships alongside the other two, not separately, since React Router and TanStack Start are both built on React). Tier 2 (Next.js, Remix, SolidStart) and Tier 3 (Vue, Nuxt, Svelte, SvelteKit, Solid bare) are **explicitly deferred to post-MVP** — confirmed, not just implied by the tier numbering. They get picked up framework-by-framework once the Tier 1 adapters have proven the pattern (`06-engineering-specs/sdk/instrumentation.md`), sequenced by the same rule as §5 below: real customer demand, not a fixed calendar date. Adding a Tier 2/3 framework should mean writing one more thin adapter over the existing core, not reopening SDK architecture.

## 5. What determines moving to the next phase

Customer demand + product usage + technical readiness + reliability + a validated customer problem — never "the calendar says it's time." See `01-project/strategy.md` §7 for the full prioritization framework applied to post-MVP capabilities.
