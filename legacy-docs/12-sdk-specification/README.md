# FrontWatch — SDK Specification

The SDK is the front door of FrontWatch.

Its job is to observe a frontend application with minimal performance impact, enforce privacy controls as early as possible, and reliably deliver useful telemetry to FrontWatch.

## SDK goals

1. Framework agnostic core.
2. Thin framework adapters.
3. SPA, SSR, and SSG compatibility.
4. Minimal runtime overhead.
5. Privacy by default.
6. Bounded memory and network usage.
7. Failure isolation.
8. Reliable batching and transport.
9. Consistent event schema.
10. Excellent developer experience.

## Architecture

```text
Customer Application
        │
        ▼
   Framework Adapter
        │
        ▼
     SDK Core
        │
 ┌──────┼─────────┬─────────┐
 ▼      ▼         ▼         ▼
Errors Network Performance Session
        │
        ▼
   Privacy Layer
        │
        ▼
     Sampling
        │
        ▼
      Buffer
        │
        ▼
    Transport
        │
        ▼
  Ingestion API
```

## Supported frameworks

```text
React
Next.js
React Router
Remix
TanStack Start
Vue
Nuxt
Svelte
SvelteKit
Solid
SolidStart
```

## Rendering modes

```text
SPA
SSR
SSG
Hybrid
```

The SDK must never assume that all application code executes in a browser.

## Primary design principle

The application being monitored is more important than the monitoring SDK.

```text
SDK failure
    ≠
Application failure
```
