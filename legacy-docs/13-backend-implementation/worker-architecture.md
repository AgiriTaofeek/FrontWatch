# Worker Architecture

## Worker Loop

Conceptually:

```text
receive message
     ↓
decode
     ↓
validate
     ↓
process
     ↓
persist
     ↓
ack
```

On retryable failure:

```text
retry
```

On permanent failure:

```text
dead-letter
```

## Concurrency

Workers should process multiple messages concurrently with bounded concurrency.

Avoid unbounded goroutines.

## Shutdown

On SIGTERM:

```text
stop accepting new work
 ↓
finish in-flight work
 ↓
flush/ack safely
 ↓
exit
```

## Retry

Use bounded retries with backoff.

## Idempotency

Workers must tolerate duplicate messages.

Use event IDs and appropriate storage constraints/logic.

## Worker Types

```text
TelemetryWorker
AlertWorker
RetentionWorker
```

Additional workers should be introduced only when workload requires them.
