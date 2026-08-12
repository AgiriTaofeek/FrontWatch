# Upgrade Strategy

Self-hosted customers may upgrade on their own schedule.

## Flow

```text
backup
 ↓
preflight checks
 ↓
database migration
 ↓
deploy
 ↓
health validation
 ↓
post-upgrade checks
```

## Preflight

Check:

- supported upgrade path
- storage capacity
- database version
- configuration compatibility
- infrastructure requirements

Prefer additive migrations before destructive changes.

Document:

```text
application rollback
data migration rollback
configuration rollback
```

Maintain compatibility between SDK, API, event schema, database schema, and worker versions.
