# Frontend Security

## Authentication

Use secure session/token handling appropriate to the deployment architecture.

## Authorization

Never assume hidden UI means authorized.

Backend authorization is authoritative.

## XSS

Telemetry is untrusted.

Safely render:

```text
error messages
stack traces
routes
URLs
custom metadata
breadcrumbs
```

Never inject telemetry directly as HTML.

## CSP

Maintain a strong Content Security Policy where possible.

## Secrets

Do not place:

- database credentials
- server secrets
- administrative keys

in the browser bundle.

## Source Maps

Source maps containing application source must not be publicly accessible.

## Dependency Security

Track frontend dependencies and audit them regularly.
