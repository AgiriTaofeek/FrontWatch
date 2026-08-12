# Telemetry Volume Testing

Monitoring platforms can experience traffic spikes precisely when customer applications fail.

## Scenarios

Example:

```text
Normal:
10k events/min

Incident:
500k events/min
```

The actual target must be determined by benchmark/customer requirements.

## Test

Generate:

- error bursts
- network failure bursts
- performance event bursts
- large sessions
- many simultaneous applications

## Verify

```text
ingestion
queue
workers
storage
issue grouping
dashboard queries
```

## Priority

Critical errors should remain observable under volume pressure.

## Backpressure

Verify the platform fails predictably rather than exhausting all resources.
