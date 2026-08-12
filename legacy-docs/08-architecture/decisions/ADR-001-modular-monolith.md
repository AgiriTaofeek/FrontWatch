# ADR-001 — Start With a Modular Backend, Not Microservices

## Status

Accepted for MVP

## Decision

Use a modular backend architecture with explicit domain boundaries, while keeping most control-plane functionality in a single deployable application initially.

Telemetry ingestion and processing may be separately deployable where operationally justified.

## Why

The product is complex enough to require strong boundaries but early enough that fully distributed microservices would create unnecessary operational cost.

## Benefits

- simpler development
- simpler self-hosting
- easier local development
- fewer network failure modes
- clear domain ownership
- easier future extraction

## Future Extraction

A module may become a service when:

- it has materially different scaling requirements
- it needs independent deployment
- it creates operational contention
- a clear ownership boundary exists

Do not split services merely because a domain exists.
