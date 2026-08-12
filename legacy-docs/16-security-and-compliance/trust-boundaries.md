# Trust Boundaries

## Boundary 1 — Browser to Ingestion

```text
Customer Browser
       │
       ▼
Ingestion API
```

Everything arriving from the browser is untrusted.

## Boundary 2 — Ingestion to Internal Processing

Accepted events are still untrusted data.

Validation must continue before expensive processing.

## Boundary 3 — Dashboard User to API

Authenticated does not mean authorized.

Every resource access requires authorization.

## Boundary 4 — API to Storage

The application controls access to databases.

Users must never receive direct database access.

## Boundary 5 — FrontWatch to Customer Infrastructure

Self-hosted deployments may interact with:

- identity providers
- notification systems
- object storage
- CI/CD systems

These integrations require explicit trust definitions.

## Boundary 6 — Build Pipeline

Source code and dependencies become release artifacts.

The pipeline must protect artifact integrity.
