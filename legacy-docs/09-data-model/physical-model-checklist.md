# FrontWatch — Physical Data Model Checklist

Before choosing the final database/storage implementation, verify:

## Volume

- expected events/sec
- peak events/sec
- events/day
- average event size
- maximum event size
- retention duration

## Tenancy

- number of organizations
- applications per organization
- environments per application

## Cardinality

- routes
- sessions
- users
- fingerprints
- releases
- endpoints

## Queries

- top 20 production queries
- query latency targets
- dashboard concurrency
- investigation concurrency

## Retention

- expiration frequency
- partition size
- deletion cost

## Reliability

- durability requirements
- acceptable telemetry loss
- queue durability
- recovery targets

## Self-Hosting

- single-node requirements
- multi-node requirements
- backup requirements
- upgrade requirements
- operational complexity

## Security

- encryption
- tenant isolation
- audit
- access controls
- data residency

No physical storage choice should be finalized until these measurements and requirements are reviewed.
