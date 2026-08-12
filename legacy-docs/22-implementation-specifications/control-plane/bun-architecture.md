# Bun Control Plane Architecture

## Responsibilities

The Bun control plane owns:

```text
authentication
organizations
memberships
RBAC
applications
environments
projects
credentials
releases
alerts
settings
audit APIs
query APIs
```

## Request Flow

```text
HTTP
 ↓
Router
 ↓
Authentication
 ↓
Authorization
 ↓
Application service
 ↓
Repository
 ↓
PostgreSQL / ClickHouse
```

## Rules

- Keep HTTP handlers thin.
- Business rules belong in application/domain services.
- Database access belongs behind repositories/data-access modules.
- Every tenant-owned query requires an authorization scope.
- Never trust tenant IDs supplied only by the client.
