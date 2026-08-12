# Workflow — Alert Investigation

## Goal

Turn an alert into a useful investigation rather than simply acknowledging it.

## Flow

```text
Alert
 ↓
Why did it trigger?
 ↓
Affected application/environment
 ↓
Metric trend
 ↓
Issue(s)
 ↓
Release
 ↓
Sessions
 ↓
Network/performance evidence
 ↓
Resolution
```

## Alert Detail

Show:

- Trigger condition
- Actual value
- Threshold
- Evaluation window
- First triggered time
- Current state
- Related issues
- Related release

## States

```text
Triggered
Acknowledged
Recovered
Resolved
```
