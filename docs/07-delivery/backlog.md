# FrontWatch — Engineering Backlog

**Status:** Draft · Consolidates: legacy `21-engineering-tasks/backlog-structure.md`, `mvp-backlog.md`, `task-conventions.md`, `task-dependency-rules.md`, `engineering-task-template.md`. One canonical copy — see the dedup note in `execution-roadmap.md`.

## Hierarchy

```
Epic → Feature → User Story → Engineering Task → Subtask
```

Product/BA owns requirement intent (`../03-business-analysis/epics.md` and `user-stories/`); engineering owns implementation decomposition. Example: `E04 Ingestion → Secure event ingestion → receive browser telemetry → endpoint → event envelope → validation → authentication → rate limiting → queue → metrics → integration tests`.

## IDs & priority

```
EPIC:    E01
FEATURE: E01-F01
STORY:   E01-F01-S01
TASK:    E01-F01-S01-T01
```

Priority: `P0` release blocker · `P1` MVP critical · `P2` important · `P3` post-MVP. Every task needs a clear outcome, dependencies, acceptance criteria, tests, and security considerations where relevant.

## Dependency rules

Dependencies reflect technical necessity, not team convenience. Use stable API/event contracts (`../06-engineering-specs/README.md`) so frontend, SDK, backend, infrastructure, and testing can work in parallel. Avoid circular dependencies such as frontend waiting on a "perfect" backend before starting. **The critical dependency chain is the first vertical slice** (`execution-roadmap.md` §1) — everything else can flex around it.

## MVP backlog (by area)

| Area | Scope |
|---|---|
| Foundation | Repository, local environment, configuration, auth, organization/project model, CI |
| SDK | Initialization, error capture, network, performance, session, privacy, transport, release metadata |
| Ingestion | Endpoint, credentials, validation, quotas, rate limiting, queue |
| Processing | Normalization, enrichment, fingerprinting, issue grouping, ClickHouse ingestion |
| API | Health, issues, occurrences, sessions, performance, network, releases |
| Dashboard | Health, issue explorer/detail, session investigation, performance, network, releases |
| Security | RBAC, tenant isolation, audit, redaction, secrets |
| Operations | Deployment, backups, restore, internal monitoring, alerts, upgrade |
| Quality | Unit, integration, E2E, compatibility, load, failure, security |

**MVP completion test:** a real frontend can send an error and an engineer can detect and investigate it with useful production context — same test as `../02-product/mvp.md` §7.

## Engineering task template

```markdown
# TASK-ID — Title

## Objective
What implementation outcome is required?

## Context
Why does this task exist?

## Dependencies
- TASK-ID

## Scope
### In Scope
### Out of Scope

## Implementation Notes

## Acceptance Criteria
- [ ] Given... / When... / Then...

## Testing
- [ ] Unit  [ ] Integration  [ ] E2E  [ ] Performance  [ ] Security

## Observability
- Metrics: · Logs: · Traces:

## Security Considerations

## Definition of Done
- [ ] Code complete  [ ] Tests pass  [ ] Review complete  [ ] Documentation updated
```
