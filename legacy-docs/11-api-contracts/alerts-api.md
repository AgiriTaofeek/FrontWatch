# Alerts API

## Alert Rules

```text
POST   /api/v1/applications/{id}/alert-rules
GET    /api/v1/applications/{id}/alert-rules
GET    /api/v1/alert-rules/{id}
PATCH  /api/v1/alert-rules/{id}
DELETE /api/v1/alert-rules/{id}
```

## Rule Example

```json
{
  "name": "High frontend error rate",
  "metric": "error_rate",
  "operator": "gt",
  "threshold": 0.05,
  "window_seconds": 300,
  "environment": "production",
  "enabled": true
}
```

## Alert Instances

```text
GET /api/v1/applications/{id}/alerts
GET /api/v1/alerts/{id}
```

## Actions

```text
POST /api/v1/alerts/{id}/acknowledge
POST /api/v1/alerts/{id}/resolve
```

## Alert Evaluation

Alert evaluation should be asynchronous.

The API manages configuration and state; workers evaluate telemetry-derived conditions.
