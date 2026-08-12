# Deployment Monitoring

Every deployment should be observable.

## Before

Record:

```text
version
commit
configuration change
migration
expected impact
```

## During

Monitor:

```text
pod health
error rate
latency
restarts
ingestion
queue
```

## After

Compare:

```text
before deployment
vs
after deployment
```

for key SLIs.

## Automatic Detection

A deployment should be associated with subsequent health changes.

## Rollback Signal

Define conditions under which an automated or human rollback should be considered.
