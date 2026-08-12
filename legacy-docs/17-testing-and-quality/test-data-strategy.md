# Test Data Strategy

## Data Categories

Maintain fixtures for:

```text
healthy application
degraded application
incident
high-volume incident
performance regression
network outage
multiple releases
multiple tenants
```

## Synthetic Data

Synthetic telemetry should resemble real production shapes without containing real customer data.

## Large Data

Maintain generated datasets for:

```text
1k events
100k events
1m+ events
```

as appropriate for load/query testing.

## Privacy

Test fixtures must be checked to ensure they do not contain accidental secrets or PII.

## Reproducibility

Every important bug should be convertible into a deterministic regression fixture where practical.
