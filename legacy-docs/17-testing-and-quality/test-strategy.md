# Test Strategy

## Test layers

```text
                 E2E
              /                Integration  Contract
          /      |              API     Storage    SDK
          \      |       /
               Unit
```

## Unit

Fast, deterministic tests for isolated business logic.

## Integration

Validate real component interactions.

Examples:

```text
API → PostgreSQL
Worker → Redpanda → ClickHouse
```

## Contract

Verify API/event contracts between independently developed components.

## E2E

Verify critical user workflows in a real browser.

## Load

Verify behavior at expected and peak telemetry volume.

## Failure

Verify graceful behavior when dependencies fail.

## Security

Verify authorization, isolation, input handling, and secrets protection.

No single test layer is sufficient.
