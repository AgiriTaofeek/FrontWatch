# Test Environment

## Principle

Test environments should be reproducible.

## Components

A realistic integration environment should be able to run:

```text
API
ingestion
workers
PostgreSQL
ClickHouse
Redpanda
object storage
frontend
```

## Synthetic Data

Generate:

```text
errors
network events
performance events
sessions
releases
deployments
alerts
```

## Isolation

Never connect automated tests to customer production data.

## Determinism

Tests should control:

- clocks where necessary
- generated IDs
- test data
- environment configuration

## Local Development

Provide a simple command/script to bring up the required stack.
