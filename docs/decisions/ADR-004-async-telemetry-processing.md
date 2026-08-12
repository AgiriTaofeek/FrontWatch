# ADR-004 — Process Telemetry Asynchronously

## Status
Accepted

## Decision
The ingestion API acknowledges accepted telemetry after durable handoff (to a queue), rather than performing expensive processing synchronously in the request path.

## Flow
`SDK → Ingestion → Durable queue → Workers → Processing`

## Rationale
This protects customer applications and ingestion availability from storage latency, worker spikes, processing failures, and analytics workload.

## Consequence
The system becomes eventually consistent. The UI must tolerate — and make observable — a small delay between "event observed" and "event visible in dashboard." See `05-architecture/data-model.md` §9 and `05-architecture/system-architecture.md` §6-8.
