# FrontWatch — Architecture

This stage translates the product, user stories, UX workflows, and domain model into a system architecture.

## Architecture sequence

```text
Business Requirements
        ↓
Product Requirements
        ↓
User Stories
        ↓
UX/UI Workflows
        ↓
Domain Model
        ↓
Architecture                    ← CURRENT
        ↓
Logical Data Model
        ↓
Implementation Architecture
        ↓
Infrastructure / Deployment
        ↓
Engineering Plan
```

## Architecture Goals

FrontWatch must:

1. Capture frontend telemetry reliably.
2. Minimize SDK impact on customer applications.
3. Protect sensitive banking/customer data.
4. Support multiple frontend frameworks and rendering modes.
5. Process high-volume telemetry.
6. Support fast investigation queries.
7. Correlate errors, sessions, network, performance, and releases.
8. Remain self-hostable.
9. Fail safely without affecting monitored applications.
10. Monitor itself.

## Core Architecture

```text
                     CUSTOMER APPLICATION
                             │
                             ▼
                       FrontWatch SDK
                             │
                 ┌───────────┴───────────┐
                 │                       │
              Filter                  Redact
                 │                       │
                 └───────────┬───────────┘
                             ▼
                         Sampling
                             │
                             ▼
                         Transport
                             │
                             ▼
                 ┌───────────────────────┐
                 │ Ingestion / Edge      │
                 └───────────┬───────────┘
                             ▼
                       Validation
                             │
                             ▼
                       Event Pipeline
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
             Normalize    Enrich       Route
                │            │            │
                └────────────┼────────────┘
                             ▼
                         Storage
                    ┌────────┼────────┐
                    ▼        ▼        ▼
                  Raw     Derived   Aggregates
                    │        │        │
                    └────────┼────────┘
                             ▼
                         Query API
                             │
                             ▼
                        FrontWatch Web UI
```

## Architecture Philosophy

### Start modular, not prematurely distributed

The MVP should use strong internal boundaries without forcing every boundary to become a networked microservice.

The recommended initial shape is a **modular backend plus an asynchronous telemetry pipeline**.

This gives us:

- simpler local development
- fewer operational failure modes
- clear domain boundaries
- an easier path to split services later
- less infrastructure burden for self-hosted customers

### Separate control plane from telemetry plane

```text
Control Plane
├── Organizations
├── Users
├── Applications
├── Environments
├── Projects
├── Releases
├── Alert rules
└── Configuration

Telemetry Plane
├── Ingestion
├── Processing
├── Aggregation
├── Storage
└── Query
```

This distinction is fundamental to scaling FrontWatch.

## Recommended Initial Architecture

```text
                    ┌─────────────────────┐
                    │    FrontWatch Web App    │
                    └──────────┬──────────┘
                               │
                         HTTPS / API
                               │
                    ┌──────────▼──────────┐
                    │   Control/API App   │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
          Control Database             Query Services
                                             │
                                             ▼
                                      Telemetry Store


Browser SDK
    │
    ▼
Ingestion API
    │
    ▼
Durable Queue / Stream
    │
    ▼
Telemetry Workers
    │
    ├── Normalize
    ├── Fingerprint
    ├── Enrich
    ├── Aggregate
    └── Persist
```

The exact storage and queue technologies are selected in the architecture decision records.
