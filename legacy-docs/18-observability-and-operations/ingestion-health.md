# Ingestion Health

## Critical Questions

```text
Are events arriving?
Are they being accepted?
Are they reaching the queue?
Is ingestion latency increasing?
Are clients receiving errors?
```

## Signals

Track:

```text
requests/sec
events/sec
bytes/sec
4xx
5xx
rate limiting
queue publish failures
```

## Freshness

Define telemetry freshness:

```text
event timestamp
        ↓
visible in FrontWatch
```

Monitor the delay.

## Incident Pattern

```text
SDK traffic normal
+
ingestion accepted normal
+
queue lag rising
```

indicates downstream processing trouble rather than customer SDK trouble.

## Alert

Alert on sustained ingestion failures, abnormal rejection rates, and freshness degradation.
