# SDK Testing Strategy

## Unit Tests

Test:

- event creation
- context
- privacy
- sampling
- buffering
- retry logic
- normalization

## Browser Integration Tests

Test:

- error capture
- fetch instrumentation
- XHR instrumentation
- navigation
- performance
- session lifecycle

## Framework Tests

Each adapter needs framework-specific tests.

## SSR Tests

Verify:

```text
SSR build succeeds
SSR runtime does not execute browser-only code
client hydration initializes correctly
```

## Failure Tests

Simulate:

- network unavailable
- ingestion unavailable
- malformed configuration
- full buffer
- storage unavailable
- browser API missing

## Performance Tests

Track SDK overhead against defined budgets.

## Compatibility Matrix

Test representative versions of supported frameworks.

## Security Tests

Test:

- redaction
- sensitive headers
- URL filtering
- payload limits
- malicious metadata
