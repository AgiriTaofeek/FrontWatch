# Cache & Ephemeral State

## Decision

Use **Valkey** as the initial cache/ephemeral-state candidate.

Potential uses:

- short-lived query cache
- rate-limit counters
- distributed coordination
- temporary session state
- alert evaluation state

## Do Not Use It As the Source of Truth

```text
PostgreSQL → control truth
ClickHouse  → telemetry truth
Valkey     → ephemeral acceleration/state
```

## MVP Rule

If the MVP can operate reliably without Valkey, do not make it a mandatory dependency for the smallest installation.

Introduce it when measurements demonstrate a clear need.

## Why Valkey?

Valkey is an open-source Redis-compatible datastore suitable for caching and ephemeral workloads.

The key requirement is that the cache remain replaceable.

## Failure

If cache fails:

```text
Dashboard
    ↓
slower

not

data corruption
```

Critical business state must not depend solely on cache availability.
