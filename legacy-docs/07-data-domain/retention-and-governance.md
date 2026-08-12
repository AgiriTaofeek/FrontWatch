# FrontWatch — Retention & Governance

## Retention Layers

Different data classes may need different retention.

```text
Raw Events
    ↓ shorter / high volume

Derived Issues
    ↓ longer

Aggregated Metrics
    ↓ potentially longer

Audit Records
    ↓ policy-defined
```

## Retention Requirements

Policies may vary by:

- organization
- application
- environment
- event type
- retention duration

## Deletion

Deletion must account for:

- raw telemetry
- indexes
- derived records
- cached representations
- search data
- object storage where applicable

## Auditability

Sensitive administrative actions should be auditable.

Examples:

- access changes
- privacy configuration changes
- retention changes
- credential changes
- application configuration changes

## Governance Principle

Self-hosted does not automatically mean private.

Customers need explicit control over:

- access
- retention
- data residency
- redaction
- operational configuration
