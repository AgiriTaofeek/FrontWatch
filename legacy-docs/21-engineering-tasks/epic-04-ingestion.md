# E04 — Telemetry Ingestion

Runtime: **Go**

## Endpoint
- Implement POST ingestion endpoint.
- Parse event envelope.
- Validate content type.
- Enforce request/batch limits.
- Return safe responses.

## Authentication
- Validate project credential.
- Resolve application/environment.
- Reject revoked credentials.
- Avoid leaking auth details.

## Abuse Controls
- Rate limiting.
- Project quotas.
- Payload size/depth limits.
- Field limits.
- Cardinality controls.

## Queue
- Serialize normalized envelope.
- Publish to Redpanda.
- Handle publish failures.
- Add metrics/correlation IDs.

## Reliability
- Bounded retries.
- Timeouts.
- Bounded memory.
- Graceful degradation.

**Acceptance:** a valid browser event is authenticated, validated, queued, and measurable end-to-end.
