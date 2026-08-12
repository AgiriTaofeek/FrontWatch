# Key Management

## Key Types

Potential keys include:

```text
database credentials
OIDC secrets
webhook signing keys
encryption keys
session/signing keys
TLS private keys
```

## Requirements

Keys must support:

- secure storage
- controlled access
- rotation
- revocation
- auditability

## Customer Control

Enterprise customers may require customer-managed keys.

The architecture should allow integration with customer key-management infrastructure where appropriate.

## Rotation

Design rotation so old/new keys can overlap safely during transition.

## Emergency Revocation

A compromised signing or integration key must be revocable without rebuilding the entire product.
