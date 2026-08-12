# Cost & Operational Complexity

## Principle

Self-hosted does not mean "everything must run all the time."

Every infrastructure dependency creates:

- CPU cost
- memory cost
- storage cost
- backup cost
- upgrade cost
- security responsibility

## MVP Dependency Rule

A component should become mandatory only when it provides clear value.

## Core Mandatory Candidates

```text
PostgreSQL
ClickHouse
FrontWatch API
FrontWatch ingestion
FrontWatch workers
```

## Scale-Up Components

```text
Redpanda
Valkey
Kubernetes
Object storage
Dedicated collectors
```

Some may become mandatory for enterprise scale.

## Small Installation Goal

A small team should be able to run FrontWatch without needing a large distributed cluster.

## Enterprise Goal

A bank should be able to scale individual components independently.

```text
Ingestion ↑
Workers ↑
ClickHouse ↑
API ↑
```

without scaling everything equally.
