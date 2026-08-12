# Server State & Data Fetching

## Server State

Examples:

```text
issues
sessions
health
performance
network
releases
alerts
```

Use a dedicated server-state/query layer rather than copying API data into arbitrary global state.

## Query Keys

Query identity should include all relevant filters.

Conceptually:

```text
[
  "issues",
  applicationId,
  environment,
  range,
  filters
]
```

## Caching

Use short-lived caching where appropriate.

Do not assume telemetry is immutable.

## Invalidation

Examples:

```text
new issue
 ↓
invalidate issue list

alert resolved
 ↓
invalidate alert state
```

## Polling

Useful for:

- health
- active alerts
- recent issue counts

Polling intervals should be configurable and bounded.

## Live Updates

Future versions can use:

```text
SSE
WebSocket
```

for incident/live dashboards.

The initial implementation can use polling where simpler.
