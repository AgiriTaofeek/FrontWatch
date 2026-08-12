# API Architecture

## API Domains

```text
/auth
/organizations
/applications
/environments
/releases
/deployments
/issues
/sessions
/events
/performance
/network
/alerts
/settings
```

## API Principles

### Resource-Oriented

Use stable resource identities.

### Tenant-Aware

Authorization occurs on every protected resource.

### Versioned

API contracts should support evolution.

### Paginated

Large collections require explicit pagination.

### Idempotent Where Appropriate

Create/update operations that may be retried should have predictable semantics.

### Consistent Errors

Errors should have machine-readable codes and human-readable messages.

## Separate API Concerns

The public telemetry ingestion API is different from the authenticated console API.

```text
SDK
 ↓
Ingestion API
```

versus:

```text
Console
 ↓
Application API
```

They have different:

- traffic patterns
- authentication models
- latency requirements
- failure modes
- scaling characteristics

Do not combine them simply because both use HTTP.
