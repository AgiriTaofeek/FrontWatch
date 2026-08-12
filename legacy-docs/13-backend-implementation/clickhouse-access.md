# ClickHouse Access

## ClickHouse Owns

High-volume telemetry and analytical queries.

## Query Layer

Do not scatter ClickHouse SQL across handlers.

Prefer:

```text
Query Service
    ↓
ClickHouse repository/query adapter
```

## Query Design

Always consider:

- time range
- tenant/application scope
- selected dimensions
- result limit

## Insert Path

Telemetry workers should use efficient batch inserts rather than one row per network round trip.

## Query Protection

Set:

- query timeouts
- maximum result sizes
- resource limits where appropriate

## Schema Evolution

Telemetry table changes must account for long-lived self-hosted installations.

## Testing

Use representative datasets rather than tiny test fixtures when evaluating query performance.
