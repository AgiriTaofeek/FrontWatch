# SLIs & SLOs

## SLI

A Service Level Indicator is a measurable signal of service behavior.

Examples:

```text
API availability
API latency
ingestion acceptance
telemetry freshness
query success
query latency
```

## SLO

An SLO defines the desired reliability target.

Example:

```text
99.9% successful API requests over 30 days
```

Exact targets should be established after production measurements and customer requirements.

## Separate Services

Define SLOs independently for:

```text
Dashboard/API
Ingestion
Processing
Query
Alerting
```

## Important

Telemetry ingestion and dashboard availability are different reliability dimensions.

A dashboard outage does not necessarily mean telemetry is lost.

## SLO Ownership

Every SLO should have:

```text
owner
measurement
target
window
alert policy
escalation
```
