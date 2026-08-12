# Test Pyramid

## Base — Unit

Large number of fast tests:

```text
domain rules
fingerprinting
redaction
sampling
validation
formatters
```

## Middle — Integration

Moderate number:

```text
database
queue
storage
API
processing pipeline
```

## Top — E2E

Small number of high-value workflows:

```text
login
dashboard
issue investigation
session investigation
alert workflow
```

## Principle

Prefer the cheapest test that can prove the behavior.

Do not turn every unit-level behavior into a slow browser test.
