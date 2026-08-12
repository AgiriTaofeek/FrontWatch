# FrontWatch — Reliability Architecture

## Reliability Objective

FrontWatch should fail independently of the applications it monitors.

## Failure Domains

```text
SDK
 ↓
Network
 ↓
Ingestion
 ↓
Queue
 ↓
Workers
 ↓
Storage
 ↓
Query API
 ↓
Dashboard
```

Each boundary should degrade independently.

## SDK Failure

Expected behavior:

```text
FrontWatch unavailable
      ↓
Application continues
```

The SDK should:

- fail silently where appropriate
- bound memory
- bound retries
- avoid blocking critical application work

## Ingestion Failure

The SDK may retry within bounded limits.

No infinite retry loops.

## Queue Failure

Ingestion should fail fast/safely rather than blocking browser requests.

## Worker Failure

Messages remain recoverable through durable queue semantics.

## Storage Failure

Workers should retry according to bounded policy and isolate poison messages.

## Query Failure

Dashboard should communicate:

```text
Unable to load telemetry
```

rather than presenting misleading zeros.

## Partial Data

The system should distinguish:

```text
No data
Partial data
Stale data
Query failed
Healthy with zero events
```

## Disaster Recovery

Self-hosted deployments should define:

- backup policy
- recovery objectives
- restore procedure
- telemetry durability expectations
- control-plane recovery procedure
