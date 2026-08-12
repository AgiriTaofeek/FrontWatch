# ADR-013 — Redpanda for Event Streaming

## Status
Accepted as initial production candidate

## Decision
Use Redpanda for durable telemetry streaming at production scale.

## Rationale
FrontWatch needs durable buffering, replay, partitioning, consumer groups, and backpressure. Redpanda provides Kafka API compatibility with a simpler, self-managed deployment model — attractive for a self-hosted product compared to running Kafka directly. RabbitMQ was considered but is stronger for task/message routing than the durable log/stream/replay semantics this pipeline needs.

## Caveat
For small deployments, a simpler queue topology may be permitted to reduce operational burden — streaming infrastructure is justified by telemetry workload, not by wanting to "look microservice-like." See `05-architecture/tech-stack.md`.
