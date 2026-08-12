# Final MVP Backlog

## Epic 1 — Foundation

- repository structure
- local environment
- configuration
- authentication
- organization/project model
- CI

## Epic 2 — SDK

- initialization
- error capture
- network capture
- performance capture
- session context
- privacy
- batching/retry
- release metadata

## Epic 3 — Ingestion

- ingestion endpoint
- project credential
- validation
- quotas
- rate limiting
- queue publishing

## Epic 4 — Processing

- event normalization
- enrichment
- fingerprinting
- issue grouping
- ClickHouse ingestion

## Epic 5 — API

- health
- issues
- occurrences
- sessions
- performance
- network
- releases

## Epic 6 — Dashboard

- application health
- issue explorer
- issue detail
- session investigation
- performance
- network
- releases

## Epic 7 — Security

- RBAC
- tenant isolation
- audit
- redaction
- secure secrets

## Epic 8 — Operations

- deployment
- backups
- restore
- internal monitoring
- alerts
- upgrade

## Epic 9 — Quality

- unit
- integration
- E2E
- compatibility
- load
- failure
- security

## MVP Completion Test

A real frontend application must be able to:

```text
install SDK
 ↓
deploy
 ↓
produce error
 ↓
FrontWatch detects it
 ↓
engineer receives/observes issue
 ↓
engineer investigates
 ↓
engineer sees release/session/network/performance context
```

If this loop works reliably, FrontWatch has demonstrated its core value.
