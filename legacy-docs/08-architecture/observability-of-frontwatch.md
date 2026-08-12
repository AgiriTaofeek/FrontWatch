# Observability of FrontWatch

FrontWatch must monitor itself.

## Platform Signals

### Ingestion

- events received
- rejected events
- bytes received
- ingestion latency
- rate-limit events

### Processing

- queue depth
- processing latency
- processing errors
- worker utilization

### Storage

- write latency
- read latency
- capacity
- errors

### Query

- request count
- latency
- error rate
- slow queries

### API

- request count
- latency
- status codes
- authentication failures

### SDK Delivery

- accepted events
- rejected events
- delivery failures

## Core Rule

The monitoring system must have independent health signals wherever possible.

Otherwise:

```text
FrontWatch breaks
   ↓
FrontWatch says everything is healthy
```

which defeats the purpose of platform observability.

## Operational Dashboard

The eventual internal dashboard should answer:

```text
Is ingestion healthy?
Are events being dropped?
Is processing behind?
Is storage healthy?
Are queries slow?
Are customers affected?
```
