# ADR-002 — PostgreSQL for Control Plane

## Status

Accepted

## Decision

Use PostgreSQL for transactional control-plane data.

## Scope

- organizations
- users
- memberships
- applications
- environments
- projects
- releases
- deployments
- alert rules
- audit records

## Rationale

These entities need relational integrity and transactional behavior.

PostgreSQL's current documentation continues to provide mature transaction processing and partitioning capabilities.

## Consequence

Telemetry analytics should not be forced into the control database.
