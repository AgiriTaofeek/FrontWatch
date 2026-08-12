# Telemetry Ingestion API

## Endpoint

Conceptually:

```text
POST /ingest/v1/events
```

## Authentication

Use the project ingestion credential.

## Request

```json
{
  "schema_version": 1,
  "sent_at": "2026-08-11T14:30:00Z",
  "events": [
    {
      "event_id": "evt_123",
      "event_type": "error",
      "timestamp": "2026-08-11T14:29:59.123Z",
      "release": "2026.08.11",
      "session_id": "sess_123",
      "route": "/dashboard",
      "payload": {}
    }
  ]
}
```

## Response

```json
{
  "accepted": 1,
  "rejected": 0,
  "request_id": "req_123"
}
```

## Important Behavior

The endpoint should perform only the work required to safely accept the event.

```text
Authenticate
 ↓
Validate
 ↓
Apply ingestion limits
 ↓
Durably enqueue
 ↓
Acknowledge
```

Expensive processing happens asynchronously.

## Partial Acceptance

A batch may contain invalid events.

The API should support a response that identifies rejected event IDs/reasons without requiring the whole batch to be discarded.

Example:

```json
{
  "accepted": 98,
  "rejected": 2,
  "rejections": [
    {
      "event_id": "evt_7",
      "code": "INVALID_EVENT"
    }
  ]
}
```

## Limits

The API must enforce:

- maximum body size
- maximum batch size
- maximum event size
- maximum nesting
- rate limits

## Compression

Support compressed telemetry batches where useful.

## Response Semantics

The SDK must distinguish:

```text
accepted
rejected
retryable failure
non-retryable failure
```
