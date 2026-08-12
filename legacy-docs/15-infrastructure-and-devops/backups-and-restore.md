# Backups & Restore

## Critical Data

Back up:

```text
PostgreSQL
configuration
alert definitions
identity/configuration metadata
source maps where required
```

Telemetry backup policy depends on retention and durability requirements.

## Principle

A backup is not valid until restoration has been tested.

## Restore Test

```text
backup
 ↓
isolated environment
 ↓
restore
 ↓
integrity checks
 ↓
application validation
```

## RPO

Maximum acceptable data loss.

## RTO

Maximum acceptable recovery time.

Exact targets should be defined per customer deployment tier.
