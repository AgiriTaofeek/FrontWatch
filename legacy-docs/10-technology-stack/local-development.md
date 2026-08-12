# Local Development Stack

## Goal

A developer should be able to run the complete platform locally without operating a production-sized distributed system.

## Target

```text
Docker Compose
   │
   ├── web
   ├── api
   ├── ingestion
   ├── worker
   ├── PostgreSQL
   ├── ClickHouse
   ├── Redpanda
   ├── Valkey
   └── object storage emulator
```

## Development Modes

### Minimal

```text
web
api
ingestion
worker
postgres
clickhouse
```

### Full

Adds:

```text
redpanda
valkey
object storage
identity provider
observability stack
```

## Developer Experience

Target:

```text
git clone
    ↓
configuration
    ↓
one command
    ↓
full local environment
```

## Test Data

Provide a telemetry generator capable of producing:

- errors
- sessions
- network failures
- performance regressions
- releases
- deployment events

This will be essential for developing and benchmarking the investigation UI.
