# Operational Runbooks

Ship runbooks for:

```text
API unhealthy
Ingestion unavailable
Queue lagging
Worker crash loop
ClickHouse unavailable
PostgreSQL unavailable
Storage full
Certificate expiring
Backup failed
Deployment failed
Rollback
Telemetry volume spike
Security incident
```

## Structure

```text
Symptoms
Impact
Checks
Mitigation
Recovery
Verification
Escalation
```

Runbooks must be usable by a customer's DevOps/SRE team without requiring FrontWatch engineers.
