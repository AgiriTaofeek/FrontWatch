# Deployment Checklist

## Before

```text
backup
verify version
verify configuration
verify storage capacity
verify migrations
verify certificates
verify secrets
```

## Deploy

```text
deploy artifact
run migrations
start workloads
wait for readiness
```

## Validate

```text
API health
dashboard
ingestion
queue
workers
database
ClickHouse
alerts
```

## Post-Deploy

Compare:

```text
error rate
latency
ingestion
queue lag
storage
```

against baseline.

## Rollback

If critical health conditions fail, follow the documented rollback procedure.
