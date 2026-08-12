# Pagination, Filtering & Search

## Cursor Pagination

Use cursors for telemetry and large collections.

Example:

```text
GET /issues?limit=50&cursor=abc
```

## Cursor Properties

Cursors should be:

- opaque
- stable enough for traversal
- non-sensitive
- independent of physical storage implementation

## Limits

Every list endpoint should define:

```text
default limit
maximum limit
```

## Time Filters

Telemetry queries should generally require or infer a bounded time range.

Example:

```text
from
to
```

Avoid unbounded production telemetry queries.

## Filters

Supported filters should be explicit.

Examples:

```text
environment
release
route
browser
device
status
event_type
```

## Search

Issue search may support:

- title
- message
- fingerprint

Do not expose arbitrary database query languages through the public API.

## Sorting

Only approved sort fields should be accepted.

## Query Safety

The API should enforce:

- maximum time range
- maximum result size
- query timeout
- query complexity limits
