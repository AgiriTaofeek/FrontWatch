# Application Health Dashboard

## Primary Question

```text
Is the application healthy right now?
```

## Top-Level Signals

```text
Error rate
Active issues
Failed network requests
Performance
Affected users/sessions
Latest deployment
```

## Health States

```text
Healthy
Degraded
Critical
Unknown
```

## Important

`Unknown` must not be rendered as `Healthy`.

Examples:

```text
Telemetry stopped
Query failed
No recent data
```

must be distinguishable.

## Dashboard Sections

```text
Health summary
 ↓
Error trend
 ↓
Performance trend
 ↓
Network failures
 ↓
Active issues
 ↓
Recent deployments
```

## Drill Down

Every metric should lead to the underlying investigation.

Example:

```text
Error rate ↑
   ↓
Issue list
   ↓
Issue detail
```
