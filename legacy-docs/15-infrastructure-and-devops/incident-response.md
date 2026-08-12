# Infrastructure Incident Response

## Lifecycle

```text
Detect
 ↓
Triage
 ↓
Contain
 ↓
Investigate
 ↓
Recover
 ↓
Validate
 ↓
Postmortem
```

## Key Scenarios

### Ingestion down

Customer applications continue operating; monitoring data may be lost.

### Dashboard down

Telemetry may continue ingesting; investigation is unavailable.

### Storage unavailable

Workers may buffer through the queue according to available capacity.

## Postmortem

Record:

- timeline
- impact
- root cause
- contributing factors
- detection
- remediation
- prevention
