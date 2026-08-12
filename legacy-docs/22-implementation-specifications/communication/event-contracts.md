# Event Contracts

Define a versioned telemetry envelope.

Conceptually:

```text
event_id
event_type
schema_version
project_id
environment
release
timestamp
session_id
context
payload
```

Rules:

- schema version is explicit
- unknown fields are handled intentionally
- breaking changes require a compatibility strategy
- contracts are tested in CI

The SDK and Go ingestion must agree on the envelope before implementation proceeds.
