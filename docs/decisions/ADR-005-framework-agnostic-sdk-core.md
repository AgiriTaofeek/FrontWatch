# ADR-005 — Framework-Agnostic SDK Core, in TypeScript

## Status
Accepted

## Decision
Build one browser instrumentation core in TypeScript (`@frontwatch/sdk-core`) and provide thin adapters for each supported framework (React, Next.js, React Router, Remix, TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart).

## Rationale
The product requirement is broad framework support (`01-project/strategy.md` §5 — "framework-agnostic but runtime-aware"). Duplicating instrumentation logic per framework would create inconsistent behavior, duplicated bugs, higher maintenance cost, and different privacy behavior per framework — unacceptable for a product whose core promise is consistent observability regardless of framework. TypeScript specifically was chosen for type-sharing with the dashboard and its mature ecosystem for this class of SDK work.

## Consequence
Framework packages primarily adapt lifecycle hooks, routing, framework-specific error boundaries, and framework-specific SSR/client boundaries. Core telemetry behavior (client, context, transport, buffering, sampling, privacy, session, errors, network, performance, navigation, breadcrumbs) stays centralized and is never duplicated in an adapter. See `06-engineering-specs/sdk/`.
