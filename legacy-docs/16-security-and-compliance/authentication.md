# Authentication Security

## Requirements

Support enterprise identity where appropriate:

```text
OIDC
SAML
```

## Authentication vs Authorization

```text
Authentication
= who are you?

Authorization
= what are you allowed to access?
```

## Session Security

Use secure session mechanisms appropriate to deployment architecture.

Consider:

- expiration
- rotation
- revocation
- CSRF protection where applicable
- secure cookies
- secure token storage

## MFA

Enterprise installations should be able to rely on the customer's identity provider for MFA.

## Service Accounts

Service credentials must be distinct from human identities.

## Login Protection

Apply controls against:

- brute force
- credential stuffing
- suspicious authentication attempts
