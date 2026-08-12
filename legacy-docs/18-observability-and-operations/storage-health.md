# Storage Health

## PostgreSQL

Monitor:

```text
availability
connections
latency
locks
replication
disk
backup status
```

## ClickHouse

Monitor:

```text
availability
insert latency
query latency
parts/merge pressure
disk
replication
failed queries
```

## Object Storage

Monitor:

```text
availability
capacity
request failures
source-map operations
backup operations
```

## Capacity

Alert before storage reaches critical levels.

## Query Health

Storage can be technically available while queries are unusably slow.

Both availability and performance matter.
