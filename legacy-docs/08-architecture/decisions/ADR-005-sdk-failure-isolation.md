# ADR-005 — SDK Must Fail Open for the Application

## Status

Accepted

## Decision

FrontWatch SDK failures must not become application failures.

## Rules

- Monitoring code must not block critical application execution.
- Network failures must be bounded.
- Retries must be bounded.
- Internal SDK exceptions must be caught.
- Buffer memory must have limits.
- If necessary, telemetry should be dropped rather than harming the application.

## Principle

```text
Monitoring failure
      ≠
Customer application failure
```
