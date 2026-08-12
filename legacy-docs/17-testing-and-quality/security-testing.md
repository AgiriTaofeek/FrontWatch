# Security Testing

## Test Categories

```text
SAST
dependency scanning
secret scanning
DAST
penetration testing
authorization tests
tenant-isolation tests
fuzzing
```

## Critical Tests

Attempt:

```text
cross-tenant access
credential escalation
SQL injection
XSS through telemetry
SSRF
oversized payload
malformed event
```

## SDK

Test that sensitive values are redacted and untrusted content cannot become executable content.

## Infrastructure

Test:

- exposed services
- RBAC
- network policy
- container permissions
- secret access
