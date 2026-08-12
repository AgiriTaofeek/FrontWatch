# Persistent Storage

## PostgreSQL

Requires:

- persistent storage
- backup
- restore
- HA strategy for critical installations

## ClickHouse

Requires:

- persistent storage
- capacity planning
- retention
- backup strategy
- replication at scale

## Redpanda

Requires durable disks and configured replication/retention.

## Object Storage

Use for:

- source maps
- large artifacts
- archival objects
- backups where appropriate

Telemetry storage is likely to dominate capacity planning.

Conceptually:

```text
daily raw bytes
≈ events/day × average event size
```

Then account for compression, indexes, replication, derived data, and overhead.
