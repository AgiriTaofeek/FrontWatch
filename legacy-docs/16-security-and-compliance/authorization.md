# Authorization

## Model

Initial RBAC:

```text
Administrator
Engineer
Viewer
```

## Scope

Permissions should be evaluated against:

```text
organization
application
environment
project
resource
```

## Critical Rule

Never authorize based solely on client-provided IDs.

Bad:

```text
GET /orgs/org_B/issues
```

followed by trusting `org_B`.

Instead:

```text
authenticated principal
       ↓
membership lookup
       ↓
authorized organization
       ↓
resource query
```

## Tenant Isolation

Tenant scope must be applied at the data-access boundary, not only in UI code.

## Future

Support:

- custom roles
- project-level permissions
- environment-level permissions
- service-specific permissions
