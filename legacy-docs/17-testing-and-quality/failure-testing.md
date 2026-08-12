# Failure & Chaos Testing

## Principle

Dependencies fail.

Test what happens when:

```text
PostgreSQL unavailable
ClickHouse unavailable
Redpanda unavailable
object storage unavailable
DNS failure
network partition
pod killed
node lost
certificate problem
```

## Expected Behavior

The system should:

- fail gracefully
- expose health status
- retry only where safe
- avoid retry storms
- preserve durable data where possible
- recover automatically where designed

## SDK

A monitoring outage must not become an application outage.

Test:

```text
FrontWatch unavailable
```

and verify the customer's application remains functional.
