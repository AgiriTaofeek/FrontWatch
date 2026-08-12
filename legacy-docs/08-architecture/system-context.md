# System Context

## External Actors

```text
Software Engineer
DevOps Engineer
CTO
        │
        ▼
   FrontWatch Console
```

## Monitored Application

```text
Customer Web App
      │
      ▼
   FrontWatch SDK
      │
      ▼
Customer-controlled network/infrastructure
      │
      ▼
     FrontWatch
```

## High-Level System

```text
                         ┌─────────────────────┐
                         │   FrontWatch Console      │
                         │   React/Web App      │
                         └──────────┬──────────┘
                                    │
                                  HTTPS
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     API Layer       │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ▼                 ▼                 ▼
             Query Service     Config Service    Auth/RBAC
                  │                 │                 │
                  └─────────────────┼─────────────────┘
                                    ▼
                            Data / Query Layer
                                    ▲
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                   Derived Data           Telemetry Data
                         ▲                     ▲
                         │                     │
                    Processing  ◄──── Event Pipeline
                                           ▲
                                           │
                                    Ingestion Service
                                           ▲
                                           │
                                       FrontWatch SDK
                                           ▲
                                           │
                                   Customer Web App
```

## Trust Boundaries

### Boundary 1 — Browser

Untrusted environment.

The SDK must assume:

- users can inspect requests
- JavaScript can be modified
- network requests can fail
- browser APIs vary

### Boundary 2 — Ingestion

Internet-facing or customer-network-facing endpoint.

Must enforce:

- authentication/identification
- payload validation
- rate limits
- size limits
- abuse protection

### Boundary 3 — Internal Platform

Trusted service-to-service boundary, but still authenticated and authorized.

### Boundary 4 — Customer Data

Telemetry belongs to the organization and must remain tenant-isolated.
