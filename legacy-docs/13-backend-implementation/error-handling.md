# Backend Error Handling

## Error Categories

```text
validation
authentication
authorization
not_found
conflict
dependency
internal
temporary
```

## Domain Errors

Business logic returns meaningful typed errors.

## Transport Mapping

Example:

```text
ErrNotFound → 404
ErrForbidden → 403
ErrConflict → 409
validation → 400/422
dependency unavailable → 503
```

## Internal Errors

Do not expose:

- stack traces
- SQL
- internal topology
- secrets

to API clients.

## Logging

Internal errors should be logged with request/trace context.

## Retry Classification

Dependencies should distinguish:

```text
retryable
non-retryable
```

## Panic Handling

HTTP and worker boundaries should recover unexpected panics, record them, and prevent a single malformed event from taking down an entire processing loop.
