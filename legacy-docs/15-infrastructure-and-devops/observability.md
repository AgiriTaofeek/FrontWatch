# Infrastructure Observability

FrontWatch must observe itself.

## API

Track:

```text
request rate
error rate
latency
```

## Ingestion

Track:

```text
accepted events
rejected events
latency
queue publish failures
```

## Workers

Track:

```text
throughput
queue lag
processing latency
retries
dead letters
```

## Storage

Track:

```text
PostgreSQL connections/latency
ClickHouse insert/query latency
storage usage
```

## Kubernetes

Track:

```text
pod restarts
CPU
memory
node health
deployment health
```

## Alerts

Alert on:

- ingestion failure
- queue lag
- storage exhaustion
- database failure
- worker failure
- certificate expiration
- backup failure
