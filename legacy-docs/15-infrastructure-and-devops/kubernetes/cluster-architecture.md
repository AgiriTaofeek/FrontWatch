# Kubernetes Cluster Architecture

## Workloads

```text
web
api
ingestion
worker
alert-worker
retention-worker
```

Stateful systems may run in-cluster or on customer-managed infrastructure:

```text
PostgreSQL
ClickHouse
Redpanda
Object Storage
```

## Exposure

Normally expose only:

```text
Web/API
Ingestion
```

Keep databases and queues private.

## Scaling

Stateless workloads scale horizontally.

## Scheduling

Production deployments should define appropriate:

- resource requests
- resource limits
- disruption budgets
- anti-affinity where required

## Stateful Systems

Enterprise installations may use specialized operators or external managed/customer-operated infrastructure.
