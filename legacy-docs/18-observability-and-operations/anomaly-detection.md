# Anomaly Detection

## Purpose

Detect unusual FrontWatch behavior before fixed thresholds fail.

## Candidate Signals

```text
ingestion volume
error rate
queue lag
query latency
storage growth
worker throughput
```

## Initial Approach

Start with simple statistical/baseline methods.

Examples:

```text
moving average
percent change
seasonal baseline where useful
```

Do not introduce complex ML merely because the product is an observability platform.

## Guardrails

Anomaly detection must account for:

- deployments
- known traffic patterns
- maintenance
- customer onboarding
- scheduled jobs

## Explainability

An anomaly should show why it was detected.
