# Kubernetes Networking

## External

```text
User → Ingress → Web/API
Browser SDK → Ingress → Ingestion
```

## Internal

```text
API → PostgreSQL
API → ClickHouse
Ingestion → Redpanda
Worker → Redpanda
Worker → ClickHouse
```

## Network Policy

Prefer deny-by-default and explicit allow rules.

Do not expose directly to the public internet:

```text
PostgreSQL
ClickHouse
Redpanda
Valkey
```

## Enterprise Networking

Support private endpoints, internal DNS, restricted egress, and customer network controls where required.
