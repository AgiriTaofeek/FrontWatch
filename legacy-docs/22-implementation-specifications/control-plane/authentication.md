# Control Plane Authentication

Support an authentication abstraction that can initially use the selected identity mechanism and later support enterprise OIDC/SAML.

## Session

Define:

```text
login
logout
expiry
revocation
rotation
```

## Security

- secure cookies/tokens as appropriate
- CSRF protection where applicable
- no credentials in logs
- audit authentication events

Authentication establishes identity; authorization determines access.
