# Performance Testing

## Frontend

Measure:

```text
initial load
route transition
dashboard render
issue list render
session timeline render
chart render
```

## Backend

Measure:

```text
API latency
ingestion latency
processing latency
query latency
```

## SDK

Measure:

```text
startup cost
CPU
memory
network bytes
bundle size
```

## Budgets

Each major surface should have explicit performance budgets.

## Regression

Compare releases against a baseline.

A feature that increases performance cost materially must be investigated before release.
