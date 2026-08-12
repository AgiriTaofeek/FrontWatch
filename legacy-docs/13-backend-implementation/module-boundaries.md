# Backend Module Boundaries

## Organization

Owns:

- organizations
- memberships
- roles

## Application

Owns:

- applications
- environments
- projects

## Release

Owns:

- releases
- deployments

## Telemetry

Owns:

- event validation
- event normalization
- event processing

## Issues

Owns:

- fingerprinting
- grouping
- issue lifecycle

## Sessions

Owns:

- session metadata
- timeline retrieval

## Performance

Owns:

- performance queries
- metric aggregation

## Network

Owns:

- request queries
- endpoint normalization

## Alerts

Owns:

- alert rules
- evaluation
- alert lifecycle

## Privacy

Owns:

- redaction policy
- field classification
- retention policy

## Health

Owns:

- service health
- telemetry health
- platform health

## Important Rule

A module should expose business capabilities, not database tables.

Bad:

```text
GetIssueTableRows()
```

Better:

```text
GetIssueInvestigation()
```
