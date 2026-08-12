# FrontWatch — Telemetry Data Lifecycle

## Lifecycle

```text
Browser
  ↓
Capture
  ↓
Filter
  ↓
Redact
  ↓
Sample
  ↓
Batch
  ↓
Transmit
  ↓
Ingest
  ↓
Validate
  ↓
Normalize
  ↓
Enrich
  ↓
Store
  ↓
Aggregate
  ↓
Query
  ↓
Investigate
  ↓
Retain
  ↓
Expire/Delete
```

## Browser

The SDK performs lightweight processing before transmission.

Goals:

- protect sensitive data
- reduce unnecessary traffic
- minimize application overhead

## Ingestion

The platform validates:

- project identity
- schema
- payload size
- schema version
- rate limits

## Processing

Events may be:

- normalized
- enriched
- fingerprinted
- indexed
- aggregated

## Storage

Raw telemetry and derived data may have different retention and query requirements.

## Query

Investigation should use appropriate indexes/aggregates instead of scanning all raw events for every interaction.

## Retention

Retention is policy-driven and may vary by organization, application, environment, or event class.

Expiration must be predictable and auditable.
