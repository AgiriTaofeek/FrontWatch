# Logging, Metrics & Tracing

## Structured Logging

Logs should be structured and include:

```text
timestamp
level
service
request_id
trace_id
organization scope where safe
message
```

Never log sensitive telemetry.

## Metrics

Every service should expose metrics.

Core metrics:

```text
requests
errors
latency
queue depth
worker throughput
database latency
telemetry ingestion
```

## Tracing

Use distributed tracing for important internal paths:

```text
Ingestion
 ↓
Queue
 ↓
Worker
 ↓
ClickHouse
```

## Correlation

A request ID and trace ID should allow operators to follow an investigation from API request to backend operation.

## Cardinality

Do not create metrics labels from arbitrary:

```text
user ID
session ID
full URL
error message
```

This can destroy metrics-system performance.
