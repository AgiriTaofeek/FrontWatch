# Infrastructure & DevOps Risks

## R01 — Self-hosting too complex

Mitigation: deployment profiles, Helm, simple local stack, strong documentation.

## R02 — Data loss

Mitigation: durable queues, backups, replication, restore testing.

## R03 — Storage exhaustion

Mitigation: capacity alerts, retention, quotas, forecasting.

## R04 — Unsafe upgrades

Mitigation: preflight checks, migration strategy, rollback, compatibility.

## R05 — Supply-chain compromise

Mitigation: traceable artifacts, scanning, SBOM, protected CI.

## R06 — FrontWatch outage affects customer application

Mitigation: SDK isolation, bounded retries, asynchronous ingestion.

## R07 — Infrastructure is unobservable

Mitigation: independent monitoring, metrics, logs, traces, health checks.
