# Technology Tradeoffs

## PostgreSQL vs ClickHouse

```text
PostgreSQL
+ transactions
+ relational integrity
+ control-plane CRUD
- not ideal as primary telemetry analytics store

ClickHouse
+ analytical workload
+ high-cardinality telemetry
+ aggregation
+ high ingestion/query scale
- not a replacement for transactional control-plane semantics
```

Decision:

```text
Use both for their strengths.
```

## Redpanda vs RabbitMQ

```text
Redpanda
+ stream semantics
+ replay
+ partitioning
+ Kafka compatibility

RabbitMQ
+ excellent task/message semantics
+ mature routing
```

Decision:

```text
Redpanda for telemetry stream.
```

## Kubernetes vs Docker Compose

```text
Docker Compose
+ simple
+ excellent developer experience
+ small deployments

Kubernetes
+ scaling
+ orchestration
+ enterprise operations
+ declarative infrastructure
```

Decision:

```text
Compose for local development.
Kubernetes for enterprise production.
```

## Go vs TypeScript Backend

```text
Go
+ concurrency
+ operational simplicity
+ low runtime overhead
+ excellent network services

TypeScript
+ shared language with frontend
+ huge ecosystem
+ fast product iteration
```

Decision:

```text
Go backend.
TypeScript browser SDK/dashboard.
```

## OpenTelemetry vs Custom FrontWatch Protocol

Decision:

```text
Use OpenTelemetry concepts and interoperability where useful,
but retain a first-class FrontWatch event model and SDK.
```

The product must not become constrained by gaps in browser instrumentation or product-specific requirements.
