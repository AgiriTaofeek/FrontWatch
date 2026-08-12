# Session Investigation

## Goal

Reconstruct what happened during a customer's frontend session.

## Timeline

```text
Navigation
 ↓
Interaction
 ↓
Network
 ↓
Performance
 ↓
Error
```

## Session Header

Show:

```text
session duration
environment
release
browser
device
route
```

## Timeline Filtering

Allow filtering by:

```text
errors
network
navigation
performance
breadcrumbs
```

## Sensitive Data

Do not display sensitive telemetry merely because it exists in raw data.

Backend authorization and privacy controls remain authoritative.

## Deep Linking

A specific event should be directly linkable.

## Performance

Long sessions may contain thousands of events.

Use:

- virtualization
- incremental loading
- time-window loading
