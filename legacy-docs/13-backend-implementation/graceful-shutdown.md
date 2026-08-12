# Graceful Shutdown

## Services

Every Go service should handle termination signals.

## API

```text
SIGTERM
 ↓
stop accepting new requests
 ↓
finish active requests
 ↓
close dependencies
 ↓
exit
```

## Ingestion

Allow in-flight ingestion requests to complete where possible.

Avoid acknowledging messages that were not durably accepted.

## Workers

```text
stop consuming
 ↓
finish in-flight jobs
 ↓
ack completed jobs
 ↓
close queue connection
```

## Database

Close pools after dependent work has stopped.

## Shutdown Timeout

Every service should have a bounded shutdown deadline.

A shutdown must not hang indefinitely.
