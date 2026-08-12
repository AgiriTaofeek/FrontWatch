# CI Pipeline

Every pull request should run:

```text
checkout
 ↓
dependency restore
 ↓
lint
 ↓
unit tests
 ↓
integration tests
 ↓
contract tests
 ↓
security scans
 ↓
build
 ↓
container build
 ↓
artifact validation
```

## Go

Run formatting, vetting, linting, tests, and race tests where appropriate.

## Frontend

Run typecheck, lint, tests, and production build.

## SDK

Additionally run browser/framework compatibility and bundle/performance checks.

Required checks should block merges when failing.
