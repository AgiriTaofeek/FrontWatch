# FrontWatch — Event Processing Architecture

## Processing Pipeline

```text
Queue
 ↓
Decode
 ↓
Validate
 ↓
Normalize
 ↓
Privacy enforcement
 ↓
Enrich
 ↓
Fingerprint
 ↓
Correlate
 ↓
Persist
 ↓
Aggregate
```

## Normalize

Convert framework/browser-specific representations into the common FrontWatch event model.

Example:

```text
React error
Next.js error
Vue error
Svelte error
```

should become a common error representation.

## Enrich

Add context that can be safely derived:

- normalized route
- release metadata
- environment metadata
- browser family
- device category
- geographic metadata if explicitly enabled

## Fingerprint

Generate stable identities for grouping.

Example:

```text
Error event A
Error event B
Error event C
      ↓
Fingerprint X
      ↓
Issue X
```

## Correlation

Potential relationships:

```text
error ↔ network failure
error ↔ session
error ↔ release
performance regression ↔ release
```

Correlation should remain explainable.

## Idempotency

Processing should tolerate retries.

A worker may process the same message more than once.

The system therefore needs idempotent or deduplicated writes where correctness requires it.

## Dead-Letter Handling

Events that repeatedly fail processing should be isolated.

```text
Queue
 ↓
Worker
 ├── success → storage
 └── repeated failure → dead-letter path
```

Dead-letter events must be observable and recoverable.
