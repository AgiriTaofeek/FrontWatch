# Telemetry Event Contract

## Common Envelope

```json
{
  "event_id": "evt_123",
  "schema_version": 1,
  "event_type": "error",
  "timestamp": "2026-08-11T14:29:59.123Z",
  "release": "2026.08.11",
  "session_id": "sess_123",
  "route": "/dashboard",
  "client": {
    "browser": "Chrome",
    "browser_version": "149",
    "os": "macOS",
    "device": "desktop"
  },
  "payload": {}
}
```

## Required Fields

```text
event_id
schema_version
event_type
timestamp
payload
```

Project/application/environment identity comes from the ingestion credential and/or validated event context.

## Error Payload

```json
{
  "message": "TypeError: Cannot read properties of undefined",
  "exception_type": "TypeError",
  "stack_trace": "...",
  "fingerprint": "...",
  "handled": true
}
```

## Network Payload

```json
{
  "method": "GET",
  "resource": "/api/accounts",
  "status": 500,
  "duration_ms": 842,
  "outcome": "failure"
}
```

## Performance Payload

```json
{
  "metric": "LCP",
  "value": 4200,
  "route": "/dashboard"
}
```

## Breadcrumb Payload

```json
{
  "category": "navigation",
  "message": "Navigated to dashboard",
  "metadata": {}
}
```

## Privacy

The contract explicitly excludes credentials and sensitive form values by default.

## Versioning

The event schema is independently versioned from the API version.

```text
API v1
Event schema v1
```

A new API version does not necessarily imply a new event schema.
