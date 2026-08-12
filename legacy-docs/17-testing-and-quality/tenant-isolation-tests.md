# Tenant Isolation Tests

Tenant isolation receives its own test suite because failure is catastrophic.

## Matrix

Create:

```text
Organization A
Organization B
```

with similar resources.

## Attempt

From A, attempt to access:

```text
B application
B environment
B issues
B sessions
B performance
B network data
B releases
B alerts
B source maps
```

Every attempt must fail.

## Ingestion

An A ingestion credential must never write telemetry into B.

## Export

A user must never export B data.

## Automation

Run these tests on every security-sensitive backend change.
