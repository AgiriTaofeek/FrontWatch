# FrontWatch — Observability & Operations

FrontWatch must be observable enough to operate itself reliably.

## Operational principle

```text
Customer application
      ↓
     FrontWatch
      ↓
FrontWatch observes customer health
      ↓
FrontWatch observes FrontWatch health
```

The second layer is mandatory.

## Operational goals

- detect FrontWatch failures before customers report them
- understand ingestion health
- detect queue backlog
- detect storage degradation
- understand query performance
- operate safe deployments
- forecast capacity
- provide actionable alerts
- reduce MTTR

## Core operational signals

```text
Availability
Latency
Error rate
Throughput
Queue lag
Data freshness
Storage utilization
Resource saturation
```
