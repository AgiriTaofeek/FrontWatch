# E18 — Framework Integrations

Rollout order and rationale: `../../02-product/mvp.md` §5. Technical detail on the React Router / TanStack Start server-execution boundary: `../../06-engineering-specs/sdk/instrumentation.md`.

## US-18.01 — Integrate React (bare)
**Priority:** P0 · Tier 1

**As a** React engineer without a routing/meta-framework, **I want** a first-class FrontWatch integration, **so that** monitoring can be enabled without framework-specific complexity.

**Acceptance criteria:** React applications can initialize FrontWatch without React Router or TanStack Start present · React error boundary integration captures component-level errors · component lifecycle/context is supported where useful · SDK failures do not break the application.

**Note:** this is not separate implementation work from US-18.02/US-18.03 — React Router and TanStack Start both sit on top of React, so this story's error-boundary and lifecycle instrumentation *is* the shared foundation those two build on. All three ship together as Tier 1.

## US-18.02 — Integrate React Router (Framework Mode)
**Priority:** P0 · Tier 1

**As a** React Router engineer, **I want** a first-class FrontWatch integration across both SPA and SSR configurations, **so that** monitoring works correctly regardless of which rendering mode my app runs in.

**Acceptance criteria:** works in Library/Data mode (SPA) and in Framework mode with `ssr: true` and `ssr: false` · Loaders and Actions are never executed as if they were browser instrumentation — no DOM/window access, no session/breadcrumb capture, inside a loader or action · route transitions are captured via the router integration · client-side instrumentation initializes correctly on hydration when SSR is enabled · SDK failures do not break the application.

## US-18.03 — Integrate TanStack Start
**Priority:** P0 · Tier 1

**As a** TanStack Start engineer, **I want** a first-class integration that correctly handles all three SSR modes, **so that** monitoring is accurate whether a route is fully server-rendered, data-only, or a pure SPA route.

**Acceptance criteria:** `ssr: true` routes hydrate client-side instrumentation correctly · `ssr: false` routes behave as pure SPA · **`ssr: "data-only"` routes are handled as their own case** — the loader's server-side execution is not mistaken for a page render, and the resulting client-only render is captured as a client-side navigation, not a hydration · Server Function calls are correlated with the session/route that triggered them and are not misreported as page navigations · SDK failures do not break the application.

## US-18.04 — Integrate Next.js / Remix
**Priority:** P1 · Tier 2

**As a** Next.js or Remix engineer, **I want** first-class support, **so that** client-side monitoring works correctly across supported rendering modes.

**Acceptance criteria:** client-side telemetry works · SSR/SSG/CSR boundaries are handled safely · browser-only instrumentation is not executed incorrectly on the server · release/environment context is preserved.

## US-18.05 — Integrate SolidStart
**Priority:** P1 · Tier 2

**As a** SolidStart engineer, **I want** equivalent monitoring capabilities to the Tier 1 frameworks, **so that** the Solid ecosystem isn't a second-class integration.

**Acceptance criteria:** Solid applications can use the core SDK · SolidStart's SSR/client boundaries are respected · framework integration remains thin over the common instrumentation layer.

## US-18.06 — Integrate Vue / Nuxt
**Priority:** P2 · Tier 3

**As a** Vue engineer, **I want** a first-class integration, **so that** monitoring can be enabled without framework-specific complexity.

**Acceptance criteria:** Vue applications can initialize FrontWatch · Vue error handler integration captures component-level errors · Nuxt rendering boundaries are respected where applicable · SDK failures do not break the application.

## US-18.07 — Integrate Svelte / SvelteKit / Solid (bare)
**Priority:** P2 · Tier 3

**As a** Svelte or Solid engineer, **I want** equivalent monitoring capabilities, **so that** these ecosystems are supported to the same standard as the others.

**Acceptance criteria:** applications can initialize the SDK · SvelteKit server/client boundaries are respected · navigation context can be captured · framework integration remains thin over the common instrumentation layer.
