# FrontWatch — Ingestion Architecture

## Requirements

The ingestion path must be:

- fast
- resilient
- authenticated
- rate-limited
- horizontally scalable
- safe for untrusted browser input

## Recommended Flow

```text
SDK
 ↓
HTTPS
 ↓
Load Balancer / Edge
 ↓
Ingestion API
 ↓
Basic validation
 ↓
Authentication / project resolution
 ↓
Durable queue
 ↓
202 / success acknowledgement
```

Expensive processing happens after the queue.

## Why Queue Before Processing?

Without a durable buffer:

```text
Browser
 ↓
API
 ↓
Processing
 ↓
Storage
```

a storage or processing slowdown can directly cause ingestion failures.

With a queue:

```text
Browser
 ↓
API
 ↓
Queue
 ↓
Processing
```

the ingestion layer can absorb temporary downstream problems.

## Ingestion Requirements

### Authentication

The ingestion credential identifies the destination project.

It must not grant dashboard privileges.

### Payload Limits

Enforce:

- request size
- event count per batch
- field size
- nesting depth
- metadata limits

### Rate Limiting

Rate limits should exist at multiple levels:

```text
organization
application/project
source credential
IP where useful
```

### Backpressure

When downstream capacity is constrained:

```text
Queue grows
 ↓
Workers catch up
```

rather than allowing browser requests to perform expensive retries.

## SDK Retry Behavior

Retries must be bounded.

The SDK should not create a retry storm during an FrontWatch outage.

## Failure Principle

If ingestion is unavailable:

```text
Customer application
        │
        └── continues working
```

Monitoring loss is preferable to application failure.
