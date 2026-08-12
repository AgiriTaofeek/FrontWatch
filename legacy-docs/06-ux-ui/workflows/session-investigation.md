# Workflow — Session Investigation

## Goal

Reconstruct what happened during an affected customer session.

## Flow

```text
Issue
 ↓
Affected session
 ↓
Session overview
 ↓
Timeline
 ├── Navigation
 ├── Interaction
 ├── Network
 ├── Performance
 └── Errors
 ↓
Failure point
 ↓
Related issue
```

## Session View

The UI should show:

- Session identifier
- Start/end time
- Route history
- Browser/device
- Relevant errors
- Network failures
- Performance events

## Privacy

Sensitive user information must be hidden or redacted according to configured policy.
