# SDK Buffering & Transport

## Buffer

The SDK maintains an in-memory event buffer.

Requirements:

- bounded memory
- FIFO or documented prioritization
- configurable maximum events/bytes
- flush timer
- immediate flush for critical lifecycle events where possible

## Batching

Prefer:

```text
many events
 ↓
one request
```

rather than:

```text
one event
 ↓
one request
```

## Retry

Retry only failures likely to succeed later.

Use bounded exponential backoff.

## Retry Storm Protection

If FrontWatch is unavailable:

```text
SDK
 ↓
bounded retries
 ↓
drop/expire
```

Never retry forever.

## Page Lifecycle

Use browser lifecycle mechanisms where appropriate to flush pending telemetry without blocking navigation.

## Offline

Optional short-lived local buffering may be considered.

It must have strict limits and privacy implications.

## Compression

Compressed batches may be used to reduce network overhead where supported.
