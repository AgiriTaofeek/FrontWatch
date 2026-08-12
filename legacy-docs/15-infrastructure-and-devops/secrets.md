# Secrets Management

## Secrets

Examples:

```text
database credentials
OIDC secrets
signing keys
webhook secrets
encryption keys
TLS private keys
registry credentials
```

Never store production secrets in Git, images, or browser bundles.

## Deployment

Support Kubernetes Secrets and external secret managers.

Potential integrations:

```text
Vault
cloud secret managers
enterprise secret platforms
```

## Rotation

Every secret type needs a documented rotation procedure.

Logs must never contain secret values.

Browser-visible ingestion credentials are intentionally limited and are not administrative secrets.
