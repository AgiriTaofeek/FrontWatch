# Query API

The Query API powers the FrontWatch dashboard and investigation workflows.

## Application Health

```text
GET /api/v1/applications/{application_id}/health
```

Supports:

```text
environment
time range
```

Response concept:

```json
{
  "status": "degraded",
  "error_rate": 0.042,
  "active_issues": 12,
  "failed_requests": 87,
  "telemetry": {
    "status": "healthy",
    "last_event_at": "2026-08-11T14:29:59Z"
  }
}
```

## Issues

```text
GET /api/v1/applications/{application_id}/issues
```

Filters:

```text
environment
status
release
route
from
to
query
```

## Issue Detail

```text
GET /api/v1/issues/{issue_id}
```

Should return enough information for the initial investigation view.

## Issue Occurrences

```text
GET /api/v1/issues/{issue_id}/occurrences
```

Use cursor pagination.

## Session

```text
GET /api/v1/sessions/{session_id}
```

## Session Timeline

```text
GET /api/v1/sessions/{session_id}/timeline
```

Supports time/cursor boundaries.

## Performance

```text
GET /api/v1/applications/{application_id}/performance
```

Filters:

```text
metric
route
browser
device
release
environment
from
to
```

## Network

```text
GET /api/v1/applications/{application_id}/network
```

Filters:

```text
route
resource
status
release
environment
from
to
```

## Releases

```text
GET /api/v1/applications/{application_id}/releases
GET /api/v1/releases/{release_id}
```

## Query Principle

The API should return domain-oriented responses rather than exposing ClickHouse/PostgreSQL schemas directly.
