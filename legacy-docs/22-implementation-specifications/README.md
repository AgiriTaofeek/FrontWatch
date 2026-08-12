# FrontWatch — Implementation Specifications

This phase translates architecture and engineering tasks into concrete implementation boundaries.

## Runtime boundary

```text
Control Plane → TypeScript + Bun
Data Plane    → Go
Browser SDK   → TypeScript
Frontend      → TypeScript
```

## Core rule

Keep the control plane and data plane independently deployable, while using explicit contracts between them.

## First implementation target

The first vertical slice is:

```text
Browser SDK
→ Go ingestion
→ Redpanda
→ Go processor
→ ClickHouse
→ Bun API
→ Frontend issue screen
```
