# FrontWatch — Data Classification & Privacy Model

Because FrontWatch targets regulated and banking environments, data classification is a first-class domain concern.

## Classification Levels

### Public

Information safe to expose within normal product context.

Examples:

- framework name
- generic performance metric
- application version

### Internal

Operational information intended for authorized organization users.

Examples:

- issue metadata
- deployment metadata
- internal route names

### Sensitive

Information that can identify or describe customers or internal systems.

Examples:

- pseudonymous user identifiers
- detailed URLs
- detailed browser/session context

### Restricted

Information that should not enter telemetry by default.

Examples:

- passwords
- authentication tokens
- payment credentials
- secrets
- raw sensitive form values

## Data Minimization

```text
Collect minimum required data
          ↓
Redact before transmission where possible
          ↓
Restrict access
          ↓
Apply retention
          ↓
Expire/delete
```

## Privacy Requirements

- Sensitive values must not be captured by default.
- Redaction rules must be configurable.
- Privacy controls must apply across telemetry types.
- Query access must respect organization permissions.
- Retention must be configurable.
- Restricted data must not bypass configured privacy controls.

## Privacy Is Cross-Cutting

Privacy affects:

```text
SDK
 ↓
Transport
 ↓
Ingestion
 ↓
Processing
 ↓
Storage
 ↓
Query
 ↓
UI
```
