# E06 — Storage

## PostgreSQL
Create and migrate:
```text
organizations
users
memberships
applications
environments
projects
credentials
releases
alert_rules
audit_events
```
Add keys, indexes, timestamps, and deletion rules.

## ClickHouse
Create schemas for:
```text
errors
network
performance
sessions
breadcrumbs
```
Define partitioning, ordering, retention, and useful aggregates.

## Object Storage
- Source maps/artifacts.
- Access scoping.
- Upload validation.
- Private access.
- Retention.

## Lifecycle
- Retention configuration.
- Expiration jobs.
- Derived-data cleanup.
- Failure reporting.

**Acceptance:** data is tenant-scoped, queryable, appropriately indexed, and governed by retention.
