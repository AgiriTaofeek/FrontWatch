# API Conventions

## Protocol

Use HTTPS for externally exposed APIs.

## Base Version

```text
/api/v1
```

Telemetry ingestion may use a dedicated endpoint namespace because its traffic and authentication model differ.

## Content Type

```text
application/json
```

Batch telemetry requests may use compressed request bodies where supported.

## IDs

Use opaque identifiers.

Clients should not depend on database-specific identifiers.

## Timestamps

Use ISO 8601 timestamps at API boundaries.

Example:

```text
2026-08-11T14:30:00Z
```

## Pagination

Prefer cursor-based pagination for large datasets.

Example:

```text
GET /api/v1/issues?cursor=...
```

Response:

```json
{
  "data": [],
  "next_cursor": "..."
}
```

## Filtering

Filters should be explicit and bounded.

Example:

```text
?environment=production
&from=...
&to=...
&release=...
```

## Sorting

APIs should expose a controlled set of sortable fields.

Do not allow arbitrary database expressions.

## Errors

Use a consistent structure:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid.",
    "request_id": "req_123"
  }
}
```

## Request IDs

Every API response should be traceable through a request ID.

## Idempotency

Mutation endpoints that can safely be retried should support idempotency where required.

Telemetry ingestion primarily uses event IDs for deduplication.
