# ADR-007 — Kubernetes for Enterprise Deployment

## Status

Accepted as production target

## Decision

Support Kubernetes for enterprise/self-hosted production deployments.

## Rationale

The enterprise architecture needs:

- declarative deployment
- service scaling
- workload management
- health checks
- networking
- persistent storage integration
- rolling upgrades

## Consequence

Helm-based deployment and Kubernetes operational documentation become first-class deliverables.

Small installations should not be forced to operate a large cluster unnecessarily.
