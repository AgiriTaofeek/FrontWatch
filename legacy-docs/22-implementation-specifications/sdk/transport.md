# SDK Transport

## Requirements

- batching
- configurable flush interval
- maximum batch size
- retry with backoff
- offline handling
- bounded memory
- request cancellation/timeouts

## Failure Principle

```text
FrontWatch unavailable
        ↓
customer application continues normally
```

Telemetry loss is preferable to breaking the monitored application.
