# Browser End-to-End Testing

## Critical Workflow

```text
Login
 ↓
Select application
 ↓
Select environment
 ↓
Open health dashboard
 ↓
Open issue
 ↓
Inspect occurrence
 ↓
Open session
 ↓
Inspect network/performance
```

## Other Workflows

```text
create alert
resolve issue
filter dashboard
change release
search issue
update settings
```

## Browser

Use a real browser automation framework.

## Test Data

Generate deterministic synthetic telemetry.

## Assertions

Assert both:

```text
visible UI
+
backend state
```

## Stability

Avoid arbitrary sleep-based synchronization.

Wait for meaningful application state.
