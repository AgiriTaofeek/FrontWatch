# ADR-012 — ClickHouse for Telemetry Analytics

## Status
Accepted — still requires production workload benchmarks before finalizing cluster sizing and table design

## Decision
Use ClickHouse as the primary telemetry analytics store.

## Rationale
FrontWatch needs high-volume analytical queries over event data with high-cardinality dimensions. ClickHouse explicitly targets observability workloads and is designed for analytical event access patterns.

## Consequence
The logical telemetry model (`05-architecture/data-model.md`) should be optimized for columnar analytical access. See ADR-011 for the control-plane counterpart.
