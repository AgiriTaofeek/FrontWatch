# SDK Performance Budget

The SDK is part of the customer's frontend.

Therefore it must have explicit budgets.

## Budget Categories

### JavaScript

Track:

- minified size
- compressed size
- initialization cost

### CPU

Measure:

- startup CPU
- instrumentation overhead
- event serialization
- stack processing

### Memory

Measure:

- idle memory
- maximum buffer memory
- session tracking memory

### Network

Track:

- requests per page
- bytes per page
- average batch size

## Measurement

Benchmark:

```text
application without SDK
vs
application with SDK
```

Measure across representative applications.

## Critical Rule

No feature should be added to the SDK without understanding its runtime cost.

## Regression Testing

SDK performance budgets should run in CI for release candidates.
