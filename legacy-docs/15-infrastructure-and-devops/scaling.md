# Scaling Strategy

## Stateless

Scale horizontally:

```text
web
api
ingestion
workers
```

## Ingestion

Scale from:

- events/sec
- request rate
- payload throughput

## Workers

Scale from:

```text
queue lag
processing latency
```

CPU alone is insufficient.

## ClickHouse

Scale based on:

- insert throughput
- query concurrency
- storage
- retention
- replication

## PostgreSQL

Scale based on:

- transactions
- query latency
- connections
- storage

Before sizing production, measure:

```text
events/sec
peak events/sec
average event size
retention
query concurrency
```
