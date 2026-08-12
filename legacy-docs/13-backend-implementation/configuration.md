# Backend Configuration

## Configuration Categories

```text
server
database
clickhouse
queue
object storage
authentication
telemetry
privacy
retention
logging
metrics
tracing
```

## Environment Variables

Environment variables are suitable for deployment configuration.

Sensitive secrets should not be committed to repositories.

## Typed Configuration

Load configuration into typed Go structures.

Validate configuration at startup.

## Startup Failure

If a required configuration is invalid:

```text
log clear error
exit
```

Do not start in a partially configured state unless explicitly designed for it.

## Dynamic Configuration

Customer-level settings such as:

- sampling
- retention
- privacy
- alerts

belong in control-plane storage rather than static process configuration where appropriate.
