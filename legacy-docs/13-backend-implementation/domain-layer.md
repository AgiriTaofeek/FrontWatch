# Domain Layer

The domain layer contains business concepts and rules.

## Examples

```text
Issue
IssueFingerprint
Release
Deployment
AlertRule
Alert
Environment
Application
```

## Domain Rules

Examples:

```text
A membership belongs to an organization.
An alert belongs to an alert rule.
An issue belongs to an application scope.
A deployment references a release and environment.
```

## Domain Independence

The domain should not import:

- HTTP frameworks
- PostgreSQL drivers
- ClickHouse drivers
- Kafka/Redpanda clients
- Kubernetes clients

## Value Objects

Useful candidates:

```text
OrganizationID
ApplicationID
EnvironmentID
ReleaseID
IssueID
SessionID
EventID
```

Use typed identifiers where they materially improve safety.

## Domain Errors

Define meaningful domain errors such as:

```text
ErrNotFound
ErrForbidden
ErrInvalidState
ErrConflict
```

Transport layers translate these into API responses.
