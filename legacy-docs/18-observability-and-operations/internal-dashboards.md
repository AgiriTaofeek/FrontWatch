# Internal Dashboards

FrontWatch operators need dedicated dashboards separate from customer-facing application monitoring.

## Platform Overview

Show:

```text
API health
ingestion health
queue lag
worker health
storage health
query health
```

## Ingestion Dashboard

Show:

```text
events/sec
accepted/rejected
payload bytes
latency
queue publish failures
```

## Processing Dashboard

Show:

```text
throughput
queue lag
worker utilization
processing latency
retries
dead letters
```

## Storage Dashboard

Show:

```text
PostgreSQL
ClickHouse
object storage
disk
capacity
query latency
```

## Deployment Dashboard

Show:

```text
version
deployment status
error rate
latency
restart count
health changes
```
