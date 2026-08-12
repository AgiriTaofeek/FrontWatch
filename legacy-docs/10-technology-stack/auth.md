# Authentication & Authorization

## Decision

Use an OIDC-compatible authentication model.

For self-hosted deployments, **Keycloak** is the initial identity-provider candidate.

## Requirements

Support:

```text
OIDC
SAML
local authentication where required
```

The architecture should not hard-code the dashboard to one identity provider.

## Authorization

Application authorization remains FrontWatch's responsibility.

```text
Identity Provider
       ↓
Who is this user?
       ↓
FrontWatch
       ↓
What can this user access?
```

## Roles

Initial:

```text
Administrator
Engineer
Viewer
```

Future:

- custom roles
- fine-grained permissions
- project-level permissions

## Service Credentials

Separate:

```text
human authentication
```

from:

```text
SDK ingestion credentials
API/service credentials
```

An SDK credential must never become an administrative credential.

## Banking Requirement

Enterprise installations should be able to integrate with existing identity infrastructure instead of forcing users into a separate identity silo.
