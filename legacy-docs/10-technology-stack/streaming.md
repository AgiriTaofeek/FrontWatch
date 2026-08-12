# Event Streaming Technology

## Decision

Use **Redpanda** as the initial event-streaming candidate for production-scale telemetry processing.

Redpanda provides Kafka API compatibility and is designed as a self-managed streaming platform.

## Why

FrontWatch needs:

- durable buffering
- partitioned event streams
- consumer groups
- replay
- backpressure
- independent worker scaling

## Flow

```text
Ingestion
    ↓
Redpanda
    ↓
Processing Workers
    ↓
ClickHouse
```

## Topics

Conceptually:

```text
telemetry.raw
telemetry.normalized
telemetry.errors
telemetry.performance
telemetry.network
telemetry.dead-letter
```

The exact topic structure should be validated through load testing.

## Small Installation

Do not require a large Redpanda cluster for every installation.

A small self-hosted deployment may initially use a simpler queue topology if operational complexity outweighs the benefits.

## Why Not Kafka Directly?

Kafka is an excellent technology, but Redpanda's Kafka compatibility and simpler operational profile make it attractive for a self-hosted product.

## Why Not RabbitMQ?

RabbitMQ is strong for task queues and messaging, but FrontWatch's telemetry pipeline benefits from durable log/stream semantics and replayable partitions.

## Important

Streaming infrastructure is justified by telemetry workload, not by the desire to appear "microservice-like."
