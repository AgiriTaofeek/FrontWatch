# Dependency Direction

## Rule

Dependencies should point inward.

```text
Infrastructure
      ↓
Application
      ↓
Domain
```

A cleaner conceptual view:

```text
HTTP / Queue / DB
       ↓
Adapters
       ↓
Application Services
       ↓
Domain
```

## Domain

Depends on almost nothing external.

## Application

Depends on domain and interfaces.

## Infrastructure

Implements interfaces.

## Why

This allows:

- unit testing
- replacing storage
- changing transport
- easier reasoning
- fewer architectural leaks

## Forbidden Coupling

Avoid:

```text
domain → PostgreSQL
domain → HTTP
domain → ClickHouse
domain → Redpanda
```
