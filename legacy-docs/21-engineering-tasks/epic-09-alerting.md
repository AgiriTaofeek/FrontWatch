# E09 — Alerting

## Rules
Support metric, condition, threshold, window, scope, and notification.

## Evaluation
- Evaluate rules.
- Prevent duplicate triggers.
- Track state.
- Handle evaluator failures.

## Lifecycle
```text
triggered → acknowledged → recovered/resolved
```

## Notifications
Create a provider-agnostic notification boundary.

**Acceptance:** an engineer can configure an error-rate alert, trigger it with synthetic telemetry, observe it, and observe recovery.
