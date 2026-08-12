# Control Plane Authorization

## Initial Roles

```text
Administrator
Engineer
Viewer
```

## Scope

Authorization should resolve:

```text
principal
→ organization membership
→ application/environment/project scope
→ requested action
```

## Data Access

Repositories receive an authorization scope rather than arbitrary tenant IDs.

Example:

```text
IssueRepository.list(scope, filters)
```

not:

```text
IssueRepository.list(organizationId, filters)
```

where the caller can bypass scope construction.
