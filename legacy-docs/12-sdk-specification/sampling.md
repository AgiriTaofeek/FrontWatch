# SDK Sampling

## Why Sampling?

Telemetry volume can become enormous.

Sampling reduces:

- network traffic
- browser overhead
- ingestion volume
- storage cost

## Event-Specific Sampling

Different event categories may have different sampling policies.

Example:

```text
Errors       → high retention
Performance  → configurable
Breadcrumbs  → configurable
Interactions → lower sampling
```

## Dynamic Sampling

Future versions may allow server-provided sampling policies.

## Determinism

Sampling should avoid unexpected behavior where practical.

Session-aware sampling can ensure related events remain useful together.

## Privacy

Sampling must never be used as a substitute for privacy filtering.

Correct order:

```text
capture
 ↓
privacy
 ↓
sampling
```

## Developer Control

Expose reasonable configuration but avoid overwhelming developers with dozens of low-level tuning knobs.
