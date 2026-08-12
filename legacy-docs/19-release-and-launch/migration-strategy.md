# Migration Strategy

## Principles

- migrations must be versioned
- production migrations must be tested
- avoid destructive changes without a transition period
- support compatibility between application versions during rolling deployment

## Preferred Pattern

```text
add new field/table
 ↓
deploy code that supports both
 ↓
backfill
 ↓
switch reads/writes
 ↓
remove old structure later
```

## Rollback

A rollback must account for schema state.

Never assume an application rollback automatically reverses a migration.

## Customer Upgrades

Document required migration path for each release family.
