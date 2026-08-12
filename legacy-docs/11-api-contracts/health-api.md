# Health & Readiness API

## Liveness

```text
GET /health/live
```

Returns whether the process is alive.

## Readiness

```text
GET /health/ready
```

Returns whether the service can perform its required role.

## Component Health

Internal/admin health can expose:

```text
database
queue
telemetry store
object storage
workers
```

## Important Distinction

```text
Process alive
```

does not mean:

```text
System ready
```

and:

```text
System ready
```

does not necessarily mean:

```text
Telemetry fully healthy
```

## Dashboard Telemetry Health

The product should expose telemetry freshness separately from infrastructure health.
