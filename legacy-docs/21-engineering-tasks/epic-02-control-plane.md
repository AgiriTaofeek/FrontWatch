# E02 — Control Plane

Runtime: **TypeScript + Bun**

## Identity
- Authentication integration.
- Secure sessions.
- Logout.
- Authentication failure handling.
- Audit events.

## Organizations
- Organization model.
- Membership.
- Roles.
- Membership APIs.
- Authorization checks.

## Applications & Environments
- Application model/API.
- Environment model/API.
- Archive/delete behavior.
- Authorization.

## Credentials
- Generate project ingestion credential.
- Scope credential to ingestion only.
- Secure storage.
- Rotation.
- Revocation.
- Audit lifecycle.

**Acceptance:** an authenticated engineer can create an application/environment and obtain a restricted SDK credential.
