# FrontWatch — Telemetry Event Model

## Common Event Envelope

Every event should conceptually share a common envelope.

```text
Event
├── identity
│   └── event_id
├── tenancy
│   ├── organization_id
│   ├── application_id
│   └── environment_id
├── schema
│   └── schema_version
├── time
│   ├── client_timestamp
│   └── server_received_at
├── release
│   └── release_id/version
├── session
│   └── session_id
├── client
│   ├── browser
│   ├── browser_version
│   ├── operating_system
│   └── device
├── application
│   └── route
└── payload
    └── event-specific data
```

## Initial Event Types

```text
error
network
performance
navigation
interaction
breadcrumb
session
```

The event model should allow new types to be added without redesigning the whole ingestion pipeline.

## Schema Versioning

Telemetry schemas must be versioned.

Example:

```text
SDK v1 → Event schema v1
SDK v2 → Event schema v2
```

The backend must support compatibility rules for supported schema versions.

## Event Time

Keep both:

```text
client_timestamp
server_received_at
```

This matters when investigating:

- network delay
- client clock skew
- offline delivery
- ingestion latency

## Raw vs Derived

Raw telemetry:

```text
TypeError: Cannot read properties of undefined
```

Derived issue:

```text
Issue #1842
```

The issue is an interpretation/grouping of raw observations.

## Privacy Classification

Fields should be conceptually classifiable as:

```text
safe
internal
sensitive
restricted
redacted
```

Privacy rules must be enforceable before data is exposed through queries or UI.
