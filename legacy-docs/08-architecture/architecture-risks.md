# Architecture Risks

## R01 — Telemetry Volume

The system may receive dramatically more telemetry than the control plane.

**Mitigation:** separate telemetry plane, queues, horizontal workers, efficient telemetry storage.

## R02 — High Cardinality

Session IDs, URLs, users, and fingerprints can make indexes expensive.

**Mitigation:** model dimensions deliberately and benchmark query patterns.

## R03 — Self-Hosted Complexity

A powerful architecture can become too difficult for customers to operate.

**Mitigation:** provide deployment profiles and start with a modular architecture.

## R04 — SDK Performance

Poor instrumentation can harm the applications being monitored.

**Mitigation:** strict SDK budgets, asynchronous processing, sampling, benchmarking.

## R05 — Privacy Leakage

Telemetry can accidentally contain sensitive banking data.

**Mitigation:** privacy-by-default, early redaction, filtering, field classification, auditability.

## R06 — Query Latency

Raw telemetry queries can become expensive.

**Mitigation:** derived indexes, aggregates, query limits, purpose-built storage.

## R07 — Event Schema Evolution

SDKs will evolve independently from backend deployments.

**Mitigation:** explicit event schema versions and compatibility rules.

## R08 — False Correlation

The system may make a correlation look like causation.

**Mitigation:** distinguish observed facts, correlations, and hypotheses in the product model.

## R09 — Data Loss

Queue, worker, or storage failures may cause telemetry loss.

**Mitigation:** durable queues, retries, idempotency, dead-letter handling, operational metrics.

## R10 — FrontWatch Becoming a Single Point of Failure

Customers may rely heavily on FrontWatch.

**Mitigation:** graceful degradation, independent customer application execution, high availability where required.
