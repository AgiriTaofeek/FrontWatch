# Data Correctness Testing

## Goal

Telemetry must not silently become incorrect during processing.

## Validate

```text
event count
event identity
timestamps
release association
environment
application
issue fingerprint
session association
aggregates
```

## Duplicate Events

Verify duplicate delivery does not incorrectly inflate derived metrics where idempotency is required.

## Ordering

Telemetry may arrive out of order.

The system must handle realistic clock/network behavior.

## Sampling

Verify configured sampling produces expected approximate rates without violating privacy rules.

## Aggregations

Compare:

```text
raw event fixture
vs
derived dashboard result
```

to catch aggregation bugs.
