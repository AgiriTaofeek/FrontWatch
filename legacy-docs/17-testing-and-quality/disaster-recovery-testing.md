# Disaster Recovery Testing

## Goal

Prove that backups and recovery procedures work.

## Test

```text
Provision recovery environment
 ↓
Restore backup
 ↓
Start services
 ↓
Validate PostgreSQL
 ↓
Validate ClickHouse according to policy
 ↓
Validate ingestion
 ↓
Validate dashboard
 ↓
Validate alerts
```

## Measure

```text
RTO
RPO
data integrity
configuration integrity
```

## Frequency

Run recovery tests on a schedule appropriate to production criticality.

## Evidence

Record:

- date
- environment
- backup version
- recovery duration
- failures
- remediation
