# Control Plane — Authentication & Authorization

**Status:** Draft · Consolidates: legacy `22-implementation-specifications/control-plane/authentication.md`, `authorization.md`

## Authentication

Support an authentication abstraction that can initially use the selected identity mechanism and later support enterprise OIDC/SAML (see `../../05-architecture/tech-stack.md` — Keycloak as initial candidate). Session model defines login, logout, expiry, revocation, rotation. Security requirements: secure cookies/tokens as appropriate, CSRF protection where applicable, no credentials ever in logs, authentication events audited. **Authentication establishes identity; authorization determines access — these stay conceptually separate**, same rule as the data-plane spec (`../data-plane/operations.md` §Security).

## Authorization

Initial roles: Administrator, Engineer, Viewer (`../../05-architecture/tech-stack.md`). Authorization resolves `principal → organization membership → application/environment/project scope → requested action`.

**Repositories receive an authorization scope object, not raw tenant IDs the caller could bypass:**

```
IssueRepository.list(scope, filters)     // correct — scope is constructed once, authoritatively
IssueRepository.list(organizationId, filters)   // wrong — caller could pass any ID
```

This is the concrete implementation of the tenant-isolation rule in `../../05-architecture/security-architecture.md` §6 — the scope-construction step is where that rule actually gets enforced in code, not just documented as an intention.
