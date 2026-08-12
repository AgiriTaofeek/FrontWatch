# FrontWatch — Consistency & Idempotency

## Control Plane

Control-plane data generally requires stronger transactional consistency.

Examples:

- organization membership
- permissions
- application configuration
- release metadata

## Telemetry Plane

Telemetry processing is allowed to be eventually consistent.

Example:

```text
Event observed
     ↓
Queue
     ↓
Worker
     ↓
Issue appears
```

There may be a short delay.

## Event Idempotency

An event may be delivered more than once.

The system should use:

```text
event_id
```

as an idempotency/deduplication key where appropriate.

## Worker Idempotency

A worker may receive the same message again.

Operations should be safe to retry.

## Issue Creation

Issue grouping must avoid creating duplicate issues for the same fingerprint/application scope.

## Aggregation

Aggregations should tolerate retries or use mechanisms that make repeated processing safe.

## Exactly Once

Do not assume end-to-end exactly-once delivery.

Prefer:

```text
at-least-once delivery
+
idempotent processing
```

where practical.
