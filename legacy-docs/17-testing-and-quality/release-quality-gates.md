# Release Quality Gates

## Required

Before production release:

```text
build passes
unit tests pass
integration tests pass
contract tests pass
critical E2E passes
security scans pass
tenant isolation passes
migration tests pass
```

## Conditional

Depending on change:

```text
load testing
SDK compatibility
framework matrix
visual regression
DR testing
upgrade testing
```

## Blocking Issues

Do not release with unresolved critical:

```text
security vulnerability
data corruption
tenant isolation failure
critical ingestion failure
unsafe migration
```

## Release Decision

The final decision should consider:

```text
risk
impact
test evidence
known limitations
rollback plan
```
