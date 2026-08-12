# Audit Logging

## Purpose

Record security-sensitive administrative activity.

## Events

Examples:

```text
login
logout
role change
member added
member removed
API credential created
API credential revoked
alert rule changed
privacy configuration changed
retention changed
source map uploaded
data export
application deleted
```

## Audit Record

Conceptually:

```text
timestamp
actor
organization
action
resource
result
request_id
metadata
```

## Immutability

Audit records should be protected against unauthorized modification/deletion.

## Privacy

Audit logs themselves must not contain unnecessary sensitive telemetry.

## Investigation

Security administrators should be able to search audit events within authorized scope.
