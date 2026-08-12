# FrontWatch — Infrastructure & DevOps

This phase defines how FrontWatch is packaged, deployed, operated, upgraded, backed up, secured, scaled, and recovered.

## Core requirement

FrontWatch is self-hosted for regulated/banking environments, so infrastructure is part of the product.

## Deployment flow

```text
Source Control
    ↓
CI/CD
    ↓
Build / Test / Scan
    ↓
Immutable Artifacts
    ↓
Customer Infrastructure
    ↓
Kubernetes / VM
    ↓
FrontWatch
```

## Production topology

```text
Users / Browser SDK
        ↓
   Load Balancer
        ↓
      Ingress
        ↓
 ┌──────┴────────┐
 Web/API      Ingestion
                 ↓
              Redpanda
                 ↓
              Workers
          ┌──────┼──────┐
          ↓      ↓      ↓
     PostgreSQL ClickHouse Object Storage
```

## Environments

```text
local
development
staging
production
```

## Principles

- reproducible infrastructure
- no secrets in source control
- telemetry remains inside the customer deployment
- explicit health checks
- tested backups and restores
- documented upgrade/rollback procedures
- small installations remain simple
