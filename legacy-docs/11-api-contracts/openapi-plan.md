# OpenAPI & Contract Generation Plan

## Goal

Keep API contracts machine-readable.

## Recommendation

Maintain an OpenAPI specification for the control/query APIs.

Use it to generate or validate:

- client types
- API documentation
- contract tests

## Telemetry

The telemetry event contract should have its own schema definition because it has different evolution and throughput requirements.

## Source of Truth

Avoid having:

```text
Go structs
+
OpenAPI
+
frontend types
```

all independently maintained.

Choose an explicit source-of-truth workflow.

## Contract Testing

CI should verify:

```text
API implementation
      ↕
OpenAPI contract
      ↕
Generated client expectations
```

## Versioning

Every released API version should have a corresponding versioned contract artifact.
