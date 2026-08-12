# First Vertical Slice

## Goal
A developer deploys a small frontend, intentionally throws an error, and sees the grouped issue in FrontWatch.

## Scope
- SDK initialization.
- Error capture.
- Ingestion.
- Queue.
- Processing.
- Fingerprinting.
- Persistence.
- Issue API.
- Issue list.
- Issue detail.

## Defer
Advanced performance, session replay, complex alerts, custom dashboards, ML anomaly detection, and broad integrations.

## Demo
```text
Frontend error
→ SDK
→ Go ingestion
→ Redpanda
→ Go processor
→ storage
→ Bun API
→ dashboard issue
```
