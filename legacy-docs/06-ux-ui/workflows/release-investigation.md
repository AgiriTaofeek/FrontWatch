# Workflow — Release Investigation

## Goal

Determine whether a deployment introduced a production regression.

## Flow

```text
Releases
 ↓
Select release
 ↓
Release health
 ↓
Compare previous release
 ↓
Errors
 ↓
Performance
 ↓
Affected routes
 ↓
Affected sessions
 ↓
Deployment timeline
```

## Key Question

> Did this release change production behavior?

The UI should make before/after comparison easy.
