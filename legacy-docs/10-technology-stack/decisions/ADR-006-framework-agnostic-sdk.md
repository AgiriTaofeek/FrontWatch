# ADR-006 — TypeScript Framework-Agnostic SDK

## Status

Accepted

## Decision

Use TypeScript for the browser SDK with a framework-independent core and thin adapters.

## Rationale

FrontWatch must support many frontend frameworks and rendering modes.

## Supported Targets

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

## Consequence

Core behavior such as privacy, sampling, buffering, and transport must not be duplicated in framework adapters.
