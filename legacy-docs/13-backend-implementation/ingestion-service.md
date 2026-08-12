# Ingestion Service Implementation

## Goal

Accept telemetry quickly and safely.

## Request Path

```text
HTTP
 ↓
Credential validation
 ↓
Payload validation
 ↓
Limits
 ↓
Privacy checks possible at boundary
 ↓
Queue publish
 ↓
Acknowledgement
```

## Do Not

Avoid:

```text
HTTP request
 ↓
parse
 ↓
fingerprint
 ↓
ClickHouse insert
 ↓
issue grouping
 ↓
respond
```

That makes ingestion dependent on downstream latency.

## Batch Processing

The ingestion API should accept batches.

## Backpressure

When the queue is unavailable or saturated, the service should fail predictably rather than consume unlimited memory.

## Security

Treat every field as untrusted.

## Metrics

Record:

```text
ingestion_requests_total
ingestion_events_accepted_total
ingestion_events_rejected_total
ingestion_latency
payload_bytes
queue_publish_failures
```
