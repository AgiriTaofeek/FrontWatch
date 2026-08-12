# Integration Testing

## Purpose

Verify components work together correctly.

## Core Integrations

```text
API + PostgreSQL
API + ClickHouse
Ingestion + Redpanda
Worker + Redpanda + ClickHouse
Alert Worker + storage
```

## Test Environment

Use production-compatible dependencies where practical.

## Data

Use realistic but synthetic telemetry.

Never use real customer production data in test fixtures.

## Failure Scenarios

Test:

```text
database unavailable
queue unavailable
storage timeout
malformed response
connection exhaustion
```

## Cleanup

Tests must isolate their data and clean up reliably.
