# ADR-006 — SDK Must Fail Open for the Application

## Status
Accepted

## Decision
FrontWatch SDK failures must never become application failures.

## Rules
Monitoring code must not block critical application execution · network failures must be bounded · retries must be bounded · internal SDK exceptions must be caught · buffer memory must have limits · if necessary, telemetry should be dropped rather than harming the application.

## Principle
`Monitoring failure ≠ Customer application failure.` This is the single most load-bearing constraint on the entire SDK design — see `01-project/charter.md` Constraint 1 and `06-engineering-specs/sdk/`.
