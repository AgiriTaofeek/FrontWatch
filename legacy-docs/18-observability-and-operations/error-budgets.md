# Error Budgets

An error budget is the amount of unreliability permitted by an SLO.

## Concept

```text
SLO target
   ↓
allowed failure
   ↓
error budget
```

## Example

For a 99.9% monthly availability target, the allowed downtime/error budget is approximately 0.1% of the measurement window.

The exact budget should be calculated from the chosen window.

## Usage

When the budget is healthy:

```text
feature velocity can continue
```

When the budget is exhausted:

```text
prioritize reliability
pause risky changes
```

## Telemetry

Track budget consumption over time.

## Principle

Error budgets connect product delivery decisions to operational reliability.
