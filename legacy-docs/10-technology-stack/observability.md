# FrontWatch's Own Observability

The observability platform must itself be observable.

## Signals

Monitor:

```text
metrics
logs
traces
health checks
```

## Platform Metrics

### Ingestion

- requests/sec
- events/sec
- rejected events
- ingestion latency
- payload sizes

### Queue

- queue depth
- consumer lag
- processing throughput
- dead-letter volume

### Workers

- processing latency
- errors
- retries
- CPU
- memory

### ClickHouse

- query latency
- insert latency
- failed queries
- storage usage

### PostgreSQL

- connection pool
- query latency
- locks
- replication/backup health where applicable

### API

- request latency
- error rate
- saturation

## OpenTelemetry

Use OpenTelemetry-compatible instrumentation for FrontWatch's own backend services where practical.

The collector layer can use OpenTelemetry-compatible pipelines. Grafana Alloy is one current self-hosted collector option, but it should not become a hard dependency of the product architecture.

## Golden Rule

If FrontWatch cannot tell whether FrontWatch itself is healthy, the product is not ready to be trusted.
