# Encryption

## In Transit

Production network communication should use TLS.

Protect:

```text
browser → ingestion
browser → dashboard
service → service
service → storage
```

where required by the customer's security model.

## At Rest

Customer-controlled infrastructure should support encryption at rest for:

```text
PostgreSQL
ClickHouse
Redpanda
Object Storage
backups
```

## Encryption Boundaries

Document which layer provides encryption:

```text
application
database
filesystem
cloud/platform
```

Avoid ambiguous claims such as "encrypted" without specifying the boundary.

## Key Management

Encryption keys should not be hard-coded into application images or source control.
