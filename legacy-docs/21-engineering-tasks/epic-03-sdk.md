# E03 — Browser SDK

Runtime: **TypeScript**

## Core
- Configuration API.
- Initialization.
- Environment/release context.
- Browser capability detection.
- Safe failure.

## Errors
- Uncaught errors.
- Unhandled rejections.
- Manual capture.
- Stack normalization.
- Context enrichment.

## Network
- Fetch instrumentation.
- XHR instrumentation.
- Status/duration.
- Safe resource metadata.
- Privacy filtering.

## Performance
- Navigation timing.
- Web Vitals.
- Resource timing.
- Long-task signals.

## Sessions
- Session identity.
- Navigation breadcrumbs.
- Safe interaction context.

## Privacy
- Blocked fields.
- URL sanitization.
- Header filtering.
- Input masking.
- Custom metadata filtering.

## Transport
- Batching.
- Compression where appropriate.
- Retry/backoff.
- Offline buffering.
- Bounded memory.

## Compatibility
Validate TanStack Start, React Router, Remix, Next.js, Solid Start, Svelte, Nuxt, Vue, SolidJS, and SvelteKit across documented SPA/SSR/SSG modes.

**Acceptance:** SDK captures an error without materially disrupting the host application.
