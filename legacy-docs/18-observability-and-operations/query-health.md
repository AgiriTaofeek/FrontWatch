# Query Health

## Critical Questions

```text
Are dashboards loading?
Are investigations fast enough?
Are queries failing?
Which query families are expensive?
```

## Metrics

Track:

```text
query count
success/failure
latency p50/p95/p99
timeout count
rows/bytes scanned
result size
```

## Query Classes

Separate:

```text
health
issues
sessions
performance
network
alerts
```

## Guardrails

Use:

- timeouts
- maximum ranges
- result limits
- concurrency controls

## Slow Query Investigation

Capture safe metadata allowing operators to identify expensive query patterns without logging sensitive telemetry.
