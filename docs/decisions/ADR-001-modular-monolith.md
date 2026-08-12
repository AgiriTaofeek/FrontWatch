# ADR-001 — Start With a Modular Backend, Not Microservices

## Status
Accepted for MVP

## Decision
Use a modular backend architecture with explicit domain boundaries, keeping most control-plane functionality in a single deployable application initially. Telemetry ingestion and processing may be separately deployable where operationally justified.

## Rationale
The product is complex enough to need strong boundaries, but early enough that fully distributed microservices would add unnecessary operational cost. Benefits: simpler development, simpler self-hosting, easier local development, fewer network failure modes, clear domain ownership, easier future extraction.

## Consequence
A module becomes a service when it has materially different scaling requirements, needs independent deployment, creates operational contention, or has a clear ownership boundary — not merely because a domain exists. See `05-architecture/system-architecture.md` §3.
