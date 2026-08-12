# Network Dashboard

## Goal

Identify frontend API/resource failures and latency.

## Metrics

```text
request count
failure rate
p50
p75
p95
p99
status distribution
```

## Dimensions

```text
resource
method
status
route
release
browser
environment
```

## Normalization

Display normalized resources where dynamic IDs would otherwise create noisy lists.

## Investigation

Selecting a resource should show:

```text
trend
status distribution
latency
affected routes
affected sessions
related issues
```

## Security

Never expose sensitive request/response data by default.
