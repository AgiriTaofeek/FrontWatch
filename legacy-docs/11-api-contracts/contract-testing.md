# API Contract Testing

## Goals

Prevent backend/frontend and SDK/ingestion contract drift.

## Test Layers

### Unit

Validate individual handlers and domain functions.

### Integration

Validate:

```text
API
 ↓
database
```

and:

```text
ingestion
 ↓
queue
```

### Contract

Verify responses conform to the published API contract.

### Telemetry Compatibility

Run representative event fixtures from supported SDK versions through ingestion.

## Golden Fixtures

Maintain fixtures for:

```text
error
network
performance
navigation
breadcrumb
session
```

## Compatibility Matrix

Conceptually:

| SDK | Event schema | Backend |
|---|---|---|
| current | current | supported |
| previous | previous | supported |
| old | old | compatibility-dependent |

## Failure Policy

A breaking contract change must fail CI before deployment.
