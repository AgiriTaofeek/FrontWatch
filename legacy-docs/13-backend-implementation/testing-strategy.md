# Backend Testing Strategy

## Unit Tests

Test:

- domain rules
- application services
- validation
- fingerprinting
- privacy logic
- retry classification

## Integration Tests

Test against real or production-compatible dependencies where practical:

```text
PostgreSQL
ClickHouse
Redpanda
```

## API Tests

Test:

- authentication
- authorization
- validation
- pagination
- errors
- tenant isolation

## Ingestion Tests

Use representative event batches.

Test:

- valid events
- malformed events
- oversized events
- duplicate events
- partial batch failures
- queue failures

## Worker Tests

Test:

- success
- retry
- duplicate message
- dead-letter
- graceful shutdown

## Contract Tests

Run API contract tests against published schemas.

## Load Tests

Measure:

- ingestion throughput
- processing throughput
- query latency
- queue lag
- storage insert performance

## Security Tests

Include:

- tenant escape attempts
- injection
- XSS payloads
- oversized payloads
- credential misuse
