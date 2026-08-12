# FrontWatch — Data Versioning & Migration

## Schema Versioning

There are two different concepts:

### Product Database Schema

Controls:

```text
organizations
applications
releases
alerts
```

Managed through controlled migrations.

### Telemetry Event Schema

Controls:

```text
error payload
network payload
performance payload
```

Versioned independently because SDK versions may remain deployed for long periods.

## Migration Principles

- Migrations must be backward-aware where rolling deployments require it.
- Destructive changes should be staged.
- Large telemetry migrations should avoid blocking ingestion.
- Event compatibility should be explicit.

## Rolling Upgrade

Conceptually:

```text
Old API
   ↓
supports old + new schema

Deploy new workers
   ↓
process old + new events

Deploy new SDK

   ↓

Remove old compatibility
```

## Self-Hosted Upgrade

Migration documentation must identify:

- required version
- database changes
- event compatibility
- downtime requirements
- rollback considerations
