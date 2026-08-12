# Secure Browser SDK

The SDK runs inside customer applications and therefore has a unique threat model.

## Requirements

- minimal dependencies
- no dynamic code execution
- safe DOM handling
- strict payload limits
- privacy-first defaults
- secure transport
- limited ingestion privileges

## Credential Model

Browser-visible project credentials must not grant:

```text
dashboard access
administrative access
data deletion
organization management
```

They should only permit appropriate telemetry ingestion.

## Application Integrity

The SDK cannot assume the host application is trustworthy.

Server-side validation remains mandatory.

## CSP

The SDK should document compatibility with Content Security Policy configurations.

## Dependency Security

Track and audit all SDK dependencies.

## Bundle Security

Avoid shipping unnecessary code into customer applications.
