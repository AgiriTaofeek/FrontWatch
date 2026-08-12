# Secure Ingestion

## Threat Model

The ingestion API is intentionally internet-facing in many deployments.

Assume hostile input.

## Controls

```text
TLS
 ↓
credential validation
 ↓
rate limiting
 ↓
body-size limits
 ↓
schema validation
 ↓
field limits
 ↓
safe enqueue
```

## Abuse Protection

Control:

- requests/sec
- events/sec
- batch size
- event size
- nested object depth
- metadata cardinality

## Authentication

Ingestion credentials are project-scoped and minimally privileged.

## Response Safety

Never expose internal processing details.

## Availability

Ingestion must degrade safely when downstream systems are unavailable.

It must not consume unlimited memory while attempting retries.
