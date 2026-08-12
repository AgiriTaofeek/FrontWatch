# Data Retention & Deletion

## Retention Categories

Define retention separately for:

```text
raw telemetry
aggregated telemetry
issues
sessions
audit logs
source maps
backups
```

## Principle

Keep data only as long as it provides legitimate product/operational value or is required by policy.

## Deletion

Deletion workflows must cover:

```text
primary storage
derived data where applicable
object storage
indexes
caches
```

## Backups

Document how deletion interacts with backups.

A record deleted from primary storage may remain in backups until backup expiration.

## Customer Controls

Enterprise customers should be able to configure retention according to supported limits.

## Verification

Deletion jobs should produce auditable completion/failure information without logging sensitive payloads.
