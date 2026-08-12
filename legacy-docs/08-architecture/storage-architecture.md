# FrontWatch — Storage Architecture

## Storage Requirements

Different workloads have different characteristics.

### Control Data

Needs:

- transactions
- relational integrity
- strong consistency
- predictable CRUD

Examples:

```text
Organization
User
Application
Environment
Release
Alert Rule
```

### Telemetry Data

Needs:

- high ingestion throughput
- time-oriented access
- efficient aggregation
- filtering
- retention/TTL
- large-scale storage

Examples:

```text
Events
Errors
Network
Performance
Breadcrumbs
```

### Derived Data

Needs:

- fast dashboard queries
- issue lookup
- aggregates
- materialized views/indexes where useful

## Architectural Recommendation

Use a polyglot storage model when justified by access patterns:

```text
Control Plane
    ↓
Transactional relational database

Telemetry Plane
    ↓
Analytics/time-series optimized storage

Large/raw artifacts
    ↓
Object storage where necessary
```

The exact technologies should be selected through ADRs and benchmarks.

## Storage Separation

Do not make every dashboard query scan raw telemetry.

Prefer:

```text
Raw events
    ↓
Processing
    ↓
Derived/indexed structures
    ↓
Fast dashboard queries
```

## Retention

Storage must support efficient expiration.

High-volume telemetry should not require expensive row-by-row deletion if the chosen technology provides partition/TTL mechanisms.

## Source of Truth

The architecture must explicitly define which layer is authoritative for:

- raw event evidence
- issue state
- release metadata
- aggregates
- audit records

Derived data should not accidentally become the only copy of critical evidence without an intentional durability decision.
