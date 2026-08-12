# API Testing

## Validate

- authentication
- authorization
- tenant isolation
- request validation
- pagination
- filtering
- error responses
- rate limits
- timeouts

## Positive Tests

Verify valid requests produce correct results.

## Negative Tests

Verify invalid or malicious requests fail safely.

## Authorization Matrix

Test:

```text
admin
engineer
viewer
unauthenticated
wrong organization
```

against each protected operation.

## Performance

API tests should include representative query ranges and payload sizes.

## Contract

Validate responses against the published API contract.
