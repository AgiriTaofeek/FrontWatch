# FrontWatch — SDK Architecture

## Goal

Create one framework-independent instrumentation core with thin framework adapters.

## Architecture

```text
                 SDK Core
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 React Adapter   Vue Adapter   Svelte Adapter
      │
      ├── Next.js
      ├── React Router
      ├── Remix
      └── TanStack Start

Additional:
Solid
SolidStart
Nuxt
SvelteKit
```

## SDK Core Modules

```text
core
├── client
├── context
├── transport
├── buffer
├── sampling
├── privacy
├── session
├── errors
├── network
├── performance
├── navigation
└── breadcrumbs
```

## Context

The SDK maintains:

```text
application
environment
release
session
route
client
```

## Buffer

Telemetry should be buffered to reduce network overhead.

The buffer must have:

- maximum size
- flush conditions
- timeout
- failure behavior

## Transport

Transport should:

- batch events
- use efficient requests
- retry safely
- avoid blocking application behavior

## Privacy

Privacy processing should happen as early as practical.

```text
Capture
 ↓
Filter
 ↓
Redact
 ↓
Sample
 ↓
Buffer
 ↓
Transmit
```

## Framework Adapters

Adapters should add framework-specific behavior without duplicating core telemetry logic.

## Browser Safety

SDK code must assume:

- browser APIs may be unavailable
- CSP may interfere
- network may fail
- browser behavior differs
- applications may have strict performance budgets

## Versioning

SDK and event schema versions must be independently identifiable.
