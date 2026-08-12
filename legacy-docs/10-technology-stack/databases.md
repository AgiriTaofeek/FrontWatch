# Database & Storage Technology

## Control Plane — PostgreSQL

Use PostgreSQL for transactional control-plane data.

Good candidates:

```text
organizations
users
memberships
applications
environments
projects
releases
deployments
alert_rules
audit_records
```

Why:

- transactions
- relational constraints
- mature SQL
- predictable CRUD
- strong ecosystem
- excellent fit for configuration/business data

Do not use PostgreSQL as the primary high-volume telemetry analytics store.

## Telemetry — ClickHouse

Use ClickHouse as the primary telemetry analytics store.

Why:

- columnar analytics
- high-throughput event workloads
- time-oriented querying
- aggregations
- high-cardinality exploration
- efficient analytical queries

Observability is an explicit ClickHouse use case, and ClickHouse's recent documentation discusses high-cardinality observability workloads directly.

## Object Storage

Use S3-compatible object storage for large artifacts where required.

Potential uses:

- source maps
- large diagnostic artifacts
- archived telemetry
- backups
- exported reports

## Separation

```text
PostgreSQL
    ↓
control/configuration

ClickHouse
    ↓
telemetry/investigation

Object Storage
    ↓
large/archival artifacts
```

This separation follows the access patterns established in the data model.
