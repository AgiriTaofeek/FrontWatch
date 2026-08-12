# Frontend Security

## Telemetry Rendering

Telemetry is untrusted.

Safely render:

```text
error messages
stack traces
routes
URLs
metadata
breadcrumbs
```

Never insert telemetry as executable HTML.

## Authentication

Use secure session/token handling.

## Authorization

The UI may hide unauthorized actions, but backend authorization remains mandatory.

## Source Maps

Private source maps must not be publicly accessible.

## CSP

Use a strong Content Security Policy where compatible with deployment.

## Dependencies

Audit frontend dependencies and minimize unnecessary third-party code.
