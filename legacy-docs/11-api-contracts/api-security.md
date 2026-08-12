# API Security Requirements

## Input Validation

Validate:

- types
- lengths
- nesting
- enumerations
- timestamps
- identifiers

## Telemetry Is Untrusted

Treat all browser-provided values as attacker-controlled.

Examples:

```text
error.message
route
URL
browser
metadata
stack_trace
```

## Authorization

Authorization must happen before returning protected data.

## Query Isolation

Every query must be tenant scoped.

## Injection

Use parameterized queries and safe query builders.

Never concatenate user-provided filters into database queries.

## Resource Exhaustion

Protect against:

- huge payloads
- huge batches
- expensive queries
- excessive pagination
- repeated retries

## SSRF

Do not allow telemetry or webhook configuration to cause arbitrary internal network requests without explicit security controls.

## Audit

Record security-sensitive configuration changes.

## Sensitive Responses

API responses should return only the fields necessary for the client workflow.
