# FrontWatch — Retention Model

## Data Classes

Retention may differ for:

```text
Raw Events
Issue Records
Aggregated Metrics
Audit Records
Release Metadata
```

## Example Conceptual Policy

```text
Raw telemetry      → shorter
Issues              → longer
Aggregates          → longer
Audit records       → policy-defined
```

The exact periods are product/customer policy decisions.

## Retention Dimensions

Potential configuration:

```text
organization
application
environment
event type
data classification
```

## Deletion Requirements

Expiration must remove or invalidate relevant:

- raw events
- indexes
- aggregates if derived from expired data
- cached results
- object artifacts

## Privacy

Retention must never silently override a stricter deletion requirement.

## Self-Hosted

Customers must be able to understand:

- what is retained
- where it is stored
- when it expires
- how deletion occurs
