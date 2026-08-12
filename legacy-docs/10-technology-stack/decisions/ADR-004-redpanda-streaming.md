# ADR-004 — Redpanda for Event Streaming

## Status

Accepted as initial production candidate

## Decision

Use Redpanda for durable telemetry streaming at production scale.

## Rationale

FrontWatch needs:

- durable buffering
- replay
- partitioning
- consumer groups
- backpressure

Redpanda provides Kafka API compatibility and a self-managed deployment model.

## Caveat

For small deployments, the architecture may permit a simpler queue topology to reduce operational burden.
