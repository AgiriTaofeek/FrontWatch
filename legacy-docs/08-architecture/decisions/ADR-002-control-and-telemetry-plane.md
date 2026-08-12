# ADR-002 — Separate Control Plane and Telemetry Plane

## Status

Accepted

## Decision

Architect FrontWatch around two logical planes.

### Control Plane

```text
Organizations
Users
Applications
Environments
Releases
Configuration
Alerts
Permissions
```

### Telemetry Plane

```text
Ingestion
Processing
Events
Issues
Sessions
Performance
Network
Aggregates
```

## Why

Their workloads are fundamentally different.

Control plane:

- transactional
- lower volume
- relational

Telemetry plane:

- high volume
- append-oriented
- time-oriented
- analytics-heavy

## Consequence

The system can scale and evolve each plane independently.
