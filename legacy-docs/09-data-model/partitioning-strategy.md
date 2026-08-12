# FrontWatch — Partitioning Strategy

## Why Partitioning Matters

Telemetry can become extremely large.

Partitioning should support:

- time-range queries
- retention
- parallel processing
- operational maintenance

## Primary Candidate

Time-based partitioning.

Conceptually:

```text
2026-08-01
2026-08-02
2026-08-03
...
```

## Secondary Considerations

Depending on storage technology and scale, partitioning may also consider:

- application
- tenant
- event category

However, excessive tenant/application partitioning can create many small partitions.

## Retention Benefit

If telemetry is partitioned by time, expiration can remove entire partitions instead of deleting individual records.

## Query Benefit

A query such as:

```text
last 24 hours
```

can scan only relevant partitions.

## Important Constraint

Do not select a partitioning strategy solely from theory.

Benchmark against expected:

- events/sec
- events/day
- organization count
- application count
- query concurrency
- retention duration
