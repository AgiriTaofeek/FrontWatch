# E05 — Telemetry Processing

Runtime: **Go**

## Consumer
- Redpanda consumer.
- Consumer groups.
- Graceful shutdown.
- Consumer lag metrics.
- Retryable failure handling.

## Normalization
- Event-version validation.
- Timestamp normalization.
- Browser/device normalization.
- Route/resource normalization.
- Release normalization.

## Privacy
- Server-side redaction.
- Forbidden-field dropping.
- Safe processing metrics.

## Fingerprinting
- Define fingerprint inputs.
- Deterministic fingerprints.
- Stable grouping.
- Release/context handling.

## Enrichment
- Application.
- Environment.
- Release.
- Session.
- Route/browser/device dimensions.

## Persistence
- ClickHouse writes.
- Issue aggregates.
- Transient failure handling.
- Processing latency metrics.

**Acceptance:** events move from queue to durable analytical storage under the correct tenant/application/environment.
