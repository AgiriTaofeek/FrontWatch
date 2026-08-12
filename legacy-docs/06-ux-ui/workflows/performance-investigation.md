# Workflow — Performance Investigation

## Goal

Determine whether frontend performance has degraded and identify where.

## Flow

```text
Performance
 ↓
Metric regression
 ↓
Affected route
 ↓
Affected release
 ↓
Browser/device segmentation
 ↓
Navigation/resource evidence
 ↓
Long tasks
 ↓
Release comparison
```

## Questions the UI Should Answer

- Which metric degraded?
- When did it degrade?
- Which route is affected?
- Which users are affected?
- Did a deployment coincide with the regression?
- Is the problem browser-specific?
