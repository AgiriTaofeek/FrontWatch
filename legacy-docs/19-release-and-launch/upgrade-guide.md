# Upgrade Guide

## Before Upgrade

```text
read release notes
check supported upgrade path
backup
check storage
check compatibility
```

## Upgrade

```text
deploy new version
run migrations
validate services
validate ingestion
validate dashboard
```

## After

Verify:

```text
telemetry
queries
alerts
source maps
audit logs
```

## Rollback

Document separate procedures for:

```text
application rollback
configuration rollback
database recovery
```

## Compatibility

Document supported combinations of:

```text
server
SDK
event schema
database
```
