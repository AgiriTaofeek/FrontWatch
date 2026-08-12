# API Authentication & Authorization

## Dashboard API

Use authenticated user sessions/tokens.

```text
User
 ↓
Identity Provider
 ↓
Authenticated principal
 ↓
FrontWatch API
```

## Ingestion API

The browser SDK uses a project-scoped ingestion credential.

This credential must not authorize:

- organization administration
- user management
- dashboard configuration
- arbitrary data access

## Authorization

Every protected API request establishes:

```text
principal
 ↓
organization
 ↓
resource
```

## Tenant Isolation

The client must never be trusted to choose an organization it can access.

For example:

```text
GET /organizations/org_B/issues
```

must be rejected if the authenticated principal belongs only to org_A.

## Roles

Initial roles:

```text
Administrator
Engineer
Viewer
```

## Service Credentials

Separate credentials should exist for:

- ingestion
- API automation
- administration

## Credential Rotation

Project ingestion credentials should support:

```text
create
rotate
revoke
```

Rotation must allow a controlled migration from old to new credentials.
