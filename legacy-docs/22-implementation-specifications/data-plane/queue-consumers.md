# Queue Consumers

## Consumer Responsibilities

- consume bounded batches
- process safely
- commit only after required persistence
- expose lag
- retry transient failures
- route poison events appropriately
- shut down gracefully

## Backpressure

When downstream storage slows:

```text
processing slows
→ queue lag increases
→ alert
→ scale/recover
```

Do not allow unbounded in-memory buffering.
