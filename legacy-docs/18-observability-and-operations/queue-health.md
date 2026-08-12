# Queue Health

## Signals

```text
queue depth
consumer lag
publish latency
consumer throughput
retry count
dead-letter count
```

## Healthy State

```text
production traffic
≈
processing throughput
```

with bounded lag.

## Warning State

```text
incoming rate
>
processing rate
```

for a sustained period.

## Capacity

Queue retention must be sufficient to absorb expected temporary downstream failures.

## Recovery

After an outage:

```text
dependency recovers
 ↓
workers catch up
 ↓
lag decreases
```

Monitor recovery rate, not only current lag.

## Alerting

Use sustained lag and time-to-drain estimates where possible.
