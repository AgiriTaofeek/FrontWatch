# ADR-003 — Separate Telemetry Ingestion From the Authenticated Console API

## Status
Accepted

## Decision
Treat telemetry ingestion and the authenticated console/control-plane API as separate architectural concerns, with different services, auth models, and scaling profiles — not just different routes on the same API.

## Rationale
They have radically different traffic, authentication, scaling, and failure characteristics: ingestion is high-volume, untrusted-input, credential-scoped, latency-sensitive; the console API is lower-volume, user-authenticated, and can tolerate more synchronous work. This is ADR-002 applied specifically at the API layer.

## Consequence
The public telemetry ingestion API and the dashboard/application API must never be combined merely because both happen to use HTTP. See `05-architecture/system-architecture.md` §10 and `05-architecture/api-contracts.md` §1.
