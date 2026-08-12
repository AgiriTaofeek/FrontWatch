# E18 — Framework Integrations

## US-18.01 — Integrate React
**Priority:** P0

**As a** React engineer,  
**I want** a first-class FrontWatch integration,  
**so that** monitoring can be enabled without framework-specific complexity.

### Acceptance Criteria
- React applications can initialize FrontWatch.
- React-specific lifecycle/context can be supported where useful.
- SDK failures do not break the application.

## US-18.02 — Integrate Next.js
**Priority:** P0

**As a** Next.js engineer,  
**I want** first-class Next.js support,  
**so that** client-side monitoring works correctly across supported rendering modes.

### Acceptance Criteria
- Client-side telemetry works.
- SSR/SSG/CSR boundaries are handled safely.
- Browser-only instrumentation is not executed incorrectly on the server.
- Release/environment context is preserved.

## US-18.03 — Integrate React Router / Remix / TanStack Start
**Priority:** P0

**As a** React framework engineer,  
**I want** routing and framework integrations,  
**so that** navigation and application context are correctly represented.

### Acceptance Criteria
- Route transitions can be observed where supported.
- Framework-specific integration does not require invasive application changes.
- SSR/server execution is not incorrectly treated as browser telemetry.

## US-18.04 — Integrate Vue / Nuxt
**Priority:** P0

**As a** Vue engineer,  
**I want** Vue ecosystem integrations,  
**so that** equivalent monitoring capabilities are available.

### Acceptance Criteria
- Vue applications can use the core SDK.
- Nuxt rendering boundaries are respected.
- Route context is captured where supported.

## US-18.05 — Integrate Svelte / SvelteKit
**Priority:** P0

**As a** Svelte engineer,  
**I want** Svelte ecosystem integrations,  
**so that** equivalent monitoring capabilities are available.

### Acceptance Criteria
- Svelte applications can initialize the SDK.
- SvelteKit server/client boundaries are respected.
- Navigation context can be captured.

## US-18.06 — Integrate Solid / SolidStart
**Priority:** P0

**As a** Solid engineer,  
**I want** Solid ecosystem integrations,  
**so that** equivalent monitoring capabilities are available.

### Acceptance Criteria
- Solid applications can use the core SDK.
- SolidStart rendering boundaries are respected.
- Framework integration remains thin over the common instrumentation layer.
