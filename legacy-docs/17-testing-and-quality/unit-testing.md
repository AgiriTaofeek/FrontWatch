# Unit Testing

## Backend

Test:

- domain rules
- application services
- validation
- fingerprinting
- authorization decisions
- retry classification
- configuration parsing

## SDK

Test:

- event creation
- context
- privacy
- sampling
- buffering
- normalization

## Frontend

Test:

- data transformations
- filters
- state transitions
- formatting
- component behavior

## Requirements

Unit tests should be:

- deterministic
- isolated
- fast
- readable

## Avoid

Do not mock everything simply to increase coverage.

A test should prove useful behavior.
