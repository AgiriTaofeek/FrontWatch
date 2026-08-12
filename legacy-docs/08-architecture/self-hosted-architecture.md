# FrontWatch — Self-Hosted Architecture

## Goal

Allow a customer to run the complete platform inside infrastructure they control.

## Conceptual Deployment

```text
                Customer Network
                       │
        ┌──────────────┴──────────────┐
        │                             │
   FrontWatch Web/API                 Ingestion
        │                             │
        └──────────────┬──────────────┘
                       │
                     Queue
                       │
                    Workers
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Control DB     Telemetry Store   Object Store
```

## Deployment Profiles

### Small

Suitable for development or smaller teams.

```text
Web/API
Worker
Database
Telemetry Store
```

### Production

Separate components with horizontal scaling.

```text
Load Balancer
     │
 ┌───┴────┐
 API     Ingestion
           │
         Queue
           │
       Workers
           │
      Storage
```

## Configuration

Configuration should cover:

- database connection
- telemetry storage
- queue
- object storage
- authentication
- retention
- encryption
- organization defaults
- resource limits

## Upgrades

The deployment model must support:

- schema migrations
- rolling upgrades where possible
- worker compatibility
- event schema compatibility
- rollback strategy

## Data Residency

Self-hosted customers retain control over where telemetry is physically stored.

## Operational Principle

The self-hosted installation must not depend on an external FrontWatch SaaS control plane to process customer telemetry.
