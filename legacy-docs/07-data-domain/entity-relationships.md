# FrontWatch — Entity Relationships

## High-Level Model

```text
Organization
│
├── Memberships
│
└── Applications
     │
     ├── Environments
     │     └── Deployments
     │           └── Releases
     │
     └── Releases
```

Telemetry:

```text
Application
    ↓
Environment
    ↓
Event
 ├── Error
 ├── Network Request
 ├── Performance Sample
 ├── Navigation
 └── Interaction
```

Investigation:

```text
Event
 ├── Session
 ├── Issue
 ├── Release
 ├── Environment
 └── Application
```

## Core Relationship Graph

```text
Organization
     │
     ▼
Application
     │
     ├──────────────► Environment
     │                    │
     │                    ▼
     │                Deployment
     │                    │
     │                    ▼
     │                 Release
     │
     ▼
Telemetry Event
     │
     ├──► Session
     ├──► Issue
     ├──► Network
     ├──► Performance
     └──► Breadcrumb
```

## Domain Invariants

### Tenant Isolation

Every customer-owned resource must be traceable to an organization.

### Environment Isolation

Production, staging, and development telemetry must remain distinguishable.

### Release Traceability

Telemetry should reference a release whenever the application provides release information.

### Session Traceability

Session-related events should share a stable session identifier.

### Event Immutability

Raw telemetry should generally be append-oriented evidence.

### Derived Data

Issues, aggregates, health scores, and alerts are derived interpretations and may be recomputed when architecture permits.

### Referential Safety

Deletion or retention operations must not accidentally expose orphaned customer data.
