# FrontWatch — Scalability Architecture

## Scaling Dimensions

FrontWatch must scale across:

- organizations
- applications
- browser sessions
- telemetry events
- errors
- network requests
- performance samples
- concurrent queries

## Primary Scaling Strategy

Prefer horizontal scaling for stateless components.

```text
             ┌── Ingestion 1
Load Balancer ├── Ingestion 2
             └── Ingestion N
```

Workers can scale independently:

```text
Queue
 ├── Worker 1
 ├── Worker 2
 └── Worker N
```

## Partitioning

Telemetry should have a partitioning strategy based on actual access patterns.

Candidate dimensions:

- time
- tenant/application
- event category

Avoid prematurely partitioning on highly volatile or high-cardinality identifiers without evidence.

## Cardinality

Observability systems naturally produce high-cardinality dimensions.

Examples:

- URLs
- session IDs
- user IDs
- error fingerprints

The architecture must distinguish dimensions useful for indexing from values better retained as payload.

## Backpressure

A core scaling mechanism:

```text
Traffic spike
    ↓
Ingestion remains lightweight
    ↓
Queue absorbs burst
    ↓
Workers scale
    ↓
Backlog drains
```

## Query Scalability

Dashboard queries should use pre-aggregated or indexed structures where appropriate.

## Self-Hosted Reality

The architecture must support both:

```text
Small installation
    ↓
single-node / small cluster

Large bank
    ↓
multi-node horizontally scaled deployment
```

without requiring the smallest customer to operate a huge distributed system.
