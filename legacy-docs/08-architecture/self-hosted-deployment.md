# Self-Hosted Deployment Architecture

## Deployment Goal

A customer should be able to run FrontWatch inside infrastructure they control.

## Conceptual Deployment

```text
Customer Network
│
├── FrontWatch Console
│
├── API
│
├── Ingestion
│
├── Processing
│
├── Query
│
├── Storage
│
└── Platform Monitoring
```

## Deployment Models

The architecture should eventually support:

### Single-node / Evaluation

For development and small deployments.

### Production

Multiple replicas and durable storage.

### Enterprise

Separated components, stronger isolation, customer-managed infrastructure, and integration with enterprise identity/operations.

## Configuration

Configuration should be externalized for:

- database endpoints
- storage
- authentication
- retention
- ingestion limits
- secrets
- encryption
- logging

## Upgrade Requirements

Upgrades must account for:

- application version
- schema migrations
- event schema compatibility
- backward compatibility
- rollback

## Data Ownership

Customer telemetry should remain inside the customer's deployment boundary unless the customer explicitly chooses otherwise.
