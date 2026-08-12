# Disaster Recovery

## Scenarios

Plan for:

- node failure
- database failure
- storage failure
- queue failure
- bad deployment
- accidental deletion
- credential compromise
- cluster loss
- availability-zone failure

## Recovery

```text
Detect
 ↓
Declare recovery mode
 ↓
Restore infrastructure
 ↓
Restore control data
 ↓
Restore telemetry according to policy
 ↓
Start services
 ↓
Validate ingestion
 ↓
Validate queries
 ↓
Validate alerts
```

Customer documentation must clearly distinguish FrontWatch responsibilities from customer infrastructure responsibilities.

Run recovery exercises periodically.
