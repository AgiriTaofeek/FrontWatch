# Backend Performance & Concurrency

## Go Concurrency

Use goroutines for concurrent I/O/work where appropriate, but always bound concurrency.

## Worker Pools

Prefer controlled worker pools over:

```go
go process(event)
```

for unbounded event streams.

## Backpressure

```text
Queue lag increases
       ↓
worker concurrency/replicas scale
```

## Database Connections

Bound connection pools.

## Batching

Use batching for:

- telemetry inserts
- queue operations
- analytical writes

## Context

Every external operation should accept `context.Context`.

Use context deadlines for:

- HTTP
- database
- queue
- ClickHouse

## Profiling

Use production-safe profiling techniques to identify:

- CPU hotspots
- allocations
- lock contention
- goroutine growth

## Principle

Do not optimize based on intuition alone.
