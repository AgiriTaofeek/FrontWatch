# ADR-011 — PostgreSQL for Control Plane

## Status
Accepted

## Decision
Use PostgreSQL for transactional control-plane data: organizations, users, memberships, applications, environments, projects, releases, deployments, alert rules, audit records.

## Rationale
These entities need relational integrity and transactional behavior. PostgreSQL provides mature transaction processing and partitioning capabilities.

## Consequence
Telemetry analytics must not be forced into the control database — see ADR-012 (ClickHouse) for that workload. See `05-architecture/tech-stack.md` and `05-architecture/data-model.md` §1.
