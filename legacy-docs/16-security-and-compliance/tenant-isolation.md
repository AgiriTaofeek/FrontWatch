# Tenant Isolation

Tenant isolation is a critical security property.

## Logical Model

```text
Organization
 ├── Applications
 │    ├── Environments
 │    └── Projects
 └── Users
```

Every tenant-owned resource must have a defensible ownership path.

## Query Rule

Every protected telemetry query must establish:

```text
organization
+
application/project scope
+
time/filter constraints
```

## Failure Mode

A missing tenant predicate must be treated as a security defect.

## Testing

Create automated tests attempting:

```text
org_A user → org_B application
org_A user → org_B issue
org_A API token → org_B ingestion
```

All must fail.

## Defense in Depth

Use:

- authorization service
- repository/query scoping
- database permissions
- audit logging
- automated isolation tests
