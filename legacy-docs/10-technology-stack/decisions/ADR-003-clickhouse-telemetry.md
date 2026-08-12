# ADR-003 — ClickHouse for Telemetry Analytics

## Status

Accepted

## Decision

Use ClickHouse as the primary telemetry analytics store.

## Rationale

FrontWatch requires high-volume analytical queries over event data with high-cardinality dimensions.

ClickHouse explicitly targets observability workloads and is designed for analytical event workloads.

## Consequence

The logical telemetry model should be optimized for columnar analytical access.

## Important

This decision still requires production workload benchmarks before finalizing cluster sizing and table design.
