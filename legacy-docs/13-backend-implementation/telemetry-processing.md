# Telemetry Processing Implementation

## Pipeline

```text
Raw event
 ↓
Decode
 ↓
Validate
 ↓
Normalize
 ↓
Privacy enforcement
 ↓
Enrich
 ↓
Fingerprint
 ↓
Persist
 ↓
Aggregate
```

## Normalize

Convert framework-specific data into the common FrontWatch event model.

## Privacy

Privacy enforcement must remain independent of UI authorization.

## Fingerprinting

Error events are converted into stable grouping keys.

## Enrichment

Add safe derived context:

- browser family
- device class
- normalized route
- release metadata

## Persistence

Store telemetry in the telemetry storage layer.

## Derived Processing

Issue state and aggregates should be updateable/recomputable from telemetry where practical.

## Failure

A malformed event should not terminate the entire worker.
