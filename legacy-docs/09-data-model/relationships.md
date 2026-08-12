# FrontWatch — Logical Relationships

## Organization

```text
Organization 1 ─── N Membership
Organization 1 ─── N Application
```

## Users

```text
User 1 ─── N Membership
Membership N ─── 1 Organization
```

## Applications

```text
Application 1 ─── N Environment
Application 1 ─── N Project
Application 1 ─── N Release
```

## Deployments

```text
Release 1 ─── N Deployment
Environment 1 ─── N Deployment
```

A deployment therefore represents:

```text
Release + Environment + Time
```

## Telemetry

```text
Application 1 ─── N Event
Environment 1 ─── N Event
Release 1 ─── N Event
Session 1 ─── N Event
```

Not every event must have a release or session.

## Issues

```text
Issue 1 ─── N IssueOccurrence
Event 1 ─── 0..1 IssueOccurrence
Session 1 ─── N IssueOccurrence
Release 1 ─── N IssueOccurrence
```

## Alerts

```text
AlertRule 1 ─── N Alert
Application 1 ─── N AlertRule
Environment 1 ─── N AlertRule
```

## Audit

```text
Organization 1 ─── N AuditRecord
User 1 ─── N AuditRecord
```

## Important Rule

Telemetry relationships should remain tolerant of missing context.

For example:

```text
Event
 ├── release_id = null
 └── session_id = null
```

may be valid.

The ingestion pipeline must not reject otherwise valid telemetry merely because optional context is unavailable.
