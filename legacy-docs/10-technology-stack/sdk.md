# SDK Technology

## Decision

Use **TypeScript** for the browser SDK.

## Architecture

```text
@frontwatch/sdk-core
        │
 ┌──────┼───────────────┐
 ▼      ▼               ▼
React  Vue            Svelte
 │      │               │
Next   Nuxt          SvelteKit

Additional adapters:
React Router
Remix
TanStack Start
Solid
SolidStart
```

## Core SDK

The core should contain:

- client
- context
- transport
- buffering
- sampling
- privacy
- session
- errors
- network
- performance
- navigation
- breadcrumbs

## Framework Adapters

Adapters should remain thin.

They should provide:

- framework lifecycle integration
- routing context
- framework-specific error boundaries
- SSR/client boundary handling

## Browser Constraints

The SDK must have strict budgets for:

- bundle size
- CPU
- memory
- network traffic
- initialization time

## Failure Model

```text
FrontWatch SDK failure
       ↓
must not
       ↓
break customer application
```

## Interoperability

OpenTelemetry should be considered at the data/interoperability boundary, but FrontWatch should not force the browser SDK to depend on every OpenTelemetry browser component.

The current OpenTelemetry browser documentation itself describes client browser instrumentation as experimental/mostly unspecified, so FrontWatch should own the product-critical browser instrumentation layer rather than outsource core behavior to an unstable abstraction.
