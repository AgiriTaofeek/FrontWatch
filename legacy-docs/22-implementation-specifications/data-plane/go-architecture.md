# Go Data Plane Architecture

The data plane handles high-volume telemetry.

## Responsibilities

```text
ingestion
queue publishing/consumption
normalization
privacy enforcement
fingerprinting
enrichment
analytical persistence
aggregation
```

## Process Model

Prefer a small number of independently deployable Go services over premature microservice decomposition.

Initial services:

```text
ingestion
processor
```

Add dedicated services only when scale or operational ownership justifies them.
