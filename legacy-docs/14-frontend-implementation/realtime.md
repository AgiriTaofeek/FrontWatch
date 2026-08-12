# Real-Time Updates

## Initial MVP

Use bounded polling for:

```text
health
active alerts
recent issue counts
```

## Future

Introduce SSE or WebSocket updates where live investigation materially improves UX.

## Event Types

Potential live events:

```text
issue.created
issue.regressed
alert.triggered
alert.recovered
deployment.created
```

## UI Behavior

Do not automatically reorder a user's investigation context unexpectedly.

For example, if an issue list receives a new issue:

```text
show "new issues available"
```

rather than forcibly moving the user's selected row.

## Connection Failure

Live updates are enhancement, not a source of truth.

If connection fails:

```text
fallback to polling/manual refresh
```
