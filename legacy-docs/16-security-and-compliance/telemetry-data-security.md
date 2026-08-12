# Telemetry Data Security

Telemetry can contain more sensitive information than engineers expect.

## Default Principle

```text
Collect minimum necessary data.
```

## Sensitive Examples

Potentially sensitive:

```text
URLs
query parameters
error messages
custom metadata
breadcrumbs
DOM text
network metadata
user identifiers
stack traces
source maps
```

## Protection

Use:

```text
SDK filtering
ingestion validation
server-side redaction
access control
encryption
retention policies
audit
```

## Raw vs Derived Data

Derived analytics should not accidentally expose raw sensitive payloads.

## Access

Investigative access should follow least privilege.

## Export

Data exports must be controlled and audited.
