# API Errors & Rate Limits

## Error Classes

```text
400 INVALID_REQUEST
401 UNAUTHENTICATED
403 FORBIDDEN
404 NOT_FOUND
409 CONFLICT
413 PAYLOAD_TOO_LARGE
422 INVALID_EVENT
429 RATE_LIMITED
500 INTERNAL_ERROR
503 TEMPORARILY_UNAVAILABLE
```

## Error Shape

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Request rate exceeded.",
    "request_id": "req_123",
    "retry_after_seconds": 10
  }
}
```

## Retryability

The API must make retry behavior clear.

### Retryable

```text
429
502
503
504
```

### Usually Non-Retryable

```text
400
401
403
404
422
```

## Rate Limits

Rate limiting should be applied based on endpoint characteristics.

Ingestion may require:

```text
per project
per organization
per credential
```

Dashboard APIs may require:

```text
per user
per organization
```

## Retry-After

Where applicable, provide:

```text
Retry-After
```

and/or structured retry information.

## Security

Error messages must not expose:

- secrets
- internal stack traces
- database details
- sensitive telemetry
