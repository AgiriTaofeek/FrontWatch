# FrontWatch — Data & Domain Modeling

This stage defines the business/domain entities and relationships before selecting database technology or backend architecture.

## Position in the documentation lifecycle

```text
Business Requirements
        ↓
Product Requirements
        ↓
User Stories
        ↓
UX/UI Workflows
        ↓
Domain Model                 ← CURRENT
        ↓
Logical Data Model
        ↓
System Architecture
        ↓
Backend Architecture
        ↓
Infrastructure Architecture
```

## Core Principle

The domain model describes **what FrontWatch needs to represent**, not how it will be stored.

Do not prematurely choose PostgreSQL, ClickHouse, Kafka, Redis, object storage, or another technology here.

## Core Domains

```text
Identity & Access
    Organization
    User
    Membership
    Role

Application
    Application
    Environment
    Project
    Framework

Deployment
    Release
    Deployment

Telemetry
    Event
    Error
    Network Request
    Performance Sample
    Breadcrumb
    Session

Investigation
    Issue
    Issue Occurrence
    Correlation

Operations
    Alert Rule
    Alert
    Notification
    Health Snapshot

Governance
    Privacy Policy
    Sampling Policy
    Retention Policy
```

## Critical Mental Model

Telemetry is the raw evidence.

Issues, health, alerts, aggregates, and correlations are derived from that evidence.

```text
Raw telemetry
      ↓
Normalization / processing
      ↓
Derived data
      ↓
Issues / metrics / health / alerts
      ↓
Investigation
```
