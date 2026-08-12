# FrontWatch — Logical Data Model

This phase converts the domain model into a concrete logical data model without prematurely binding every decision to one database technology.

## Position

```text
Domain Model
     ↓
Architecture
     ↓
Logical Data Model              ← CURRENT
     ↓
Physical Storage Design
     ↓
Implementation
```

## Goals

Define:

- entities
- attributes
- relationships
- cardinality
- identifiers
- lifecycle
- indexing requirements
- partitioning requirements
- retention boundaries
- query access patterns
- consistency requirements

## Core Rule

The data model must be driven by FrontWatch's workload.

FrontWatch is fundamentally an observability system, so telemetry volume and investigation queries are first-class constraints.

## Two Broad Data Families

### Control Data

```text
Organization
User
Membership
Application
Environment
Project
Release
Deployment
Alert Rule
Configuration
Audit Record
```

### Telemetry Data

```text
Event
Error
Network
Performance
Breadcrumb
Session
Issue Occurrence
Aggregates
```

The two families should not automatically share the same physical storage model.
