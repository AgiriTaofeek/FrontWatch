# ADR-003 — Process Telemetry Asynchronously

## Status

Accepted

## Decision

The ingestion API should acknowledge accepted telemetry after durable handoff rather than performing expensive processing synchronously.

## Flow

```text
SDK
 ↓
Ingestion
 ↓
Durable queue
 ↓
Workers
 ↓
Processing
```

## Why

This protects customer applications and ingestion availability from:

- storage latency
- worker spikes
- processing failures
- analytics workload

## Consequences

The system becomes eventually consistent.

The UI must tolerate small delays between:

```text
event observed
```

and:

```text
event visible in dashboard
```

This delay must be observable.
