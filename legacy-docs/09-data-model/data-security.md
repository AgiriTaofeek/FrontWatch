# FrontWatch — Data Security Model

## Tenant Boundary

Every data access path must establish:

```text
authenticated principal
        ↓
organization
        ↓
resource
```

## Server-Side Authorization

Never trust frontend-selected:

```text
organization_id
application_id
environment_id
```

without validating authorization.

## Telemetry Credentials

Telemetry ingestion credentials should be:

- scoped
- revocable
- rotatable
- non-administrative

## Sensitive Data

The data model must assume telemetry can contain attacker-controlled strings.

Therefore:

- safely encode displayed values
- validate input
- sanitize query parameters
- prevent injection
- prevent XSS in dashboards

## Audit

Security-sensitive actions should produce audit records.

Examples:

```text
member added
role changed
credential rotated
retention changed
privacy rule changed
```

## Data at Rest

The deployment architecture should support customer-controlled encryption where required.
