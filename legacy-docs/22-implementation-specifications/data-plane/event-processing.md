# Event Processing

## Flow

```text
Redpanda
 ↓
decode
 ↓
validate version
 ↓
normalize
 ↓
redact
 ↓
enrich
 ↓
fingerprint
 ↓
persist
```

## Failure

Classify failures:

```text
retryable
non-retryable
poison event
```

Poison events must not block healthy events indefinitely.

## Idempotency

Define the event identity/deduplication strategy before relying on exactly-once behavior.
