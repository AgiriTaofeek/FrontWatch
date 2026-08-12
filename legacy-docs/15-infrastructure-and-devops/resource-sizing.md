# Initial Resource Sizing

Sizing must be benchmark-driven.

## Variables

```text
E = events/sec
S = average event bytes
R = retention days
Q = concurrent queries
W = worker throughput
```

## Storage

```text
daily raw bytes ≈ events/day × average event size
```

Then include:

```text
compression
indexes
replication
derived data
overhead
```

## Benchmark

1. Generate representative telemetry.
2. Measure ingestion.
3. Measure processing.
4. Measure queries.
5. Measure storage growth.
6. Apply peak traffic.
7. Test recovery.

Create deployment profiles from measured ranges rather than one universal machine size.
