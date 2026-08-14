# ADR-024 — TanStack Start for the Dashboard (apps/web)

## Status
Accepted — resolves tech-stack.md's explicitly open "exact React framework/router" question for the dashboard.

## Decision
Build `apps/web` (the dashboard) with TanStack Start, not Next.js, React Router (Framework mode), or a plain Vite + React Router SPA.

## Rationale
ADR-014 already committed to TypeScript + React for the dashboard; only the router/meta-framework was undecided. TanStack Start is also one of the SDK's two Tier 1 framework-adapter targets (`mvp.md` §5) — building the dashboard with it means FrontWatch dogfoods its own SDK on its own product, exercising the real adapter (error boundaries, navigation instrumentation, the `data-only` SSR boundary) against a real, actively-developed application instead of only synthetic test apps. This is the same reasoning `mvp.md` §5 already used to justify TanStack Start leading the SDK rollout in the first place.

The dashboard doesn't strictly need SSR (it's an authenticated internal tool, not a marketing/SEO surface), but TanStack Start doesn't force it — its per-route SSR toggle (`true` / `"data-only"` / `false`) means routes that don't benefit from SSR can simply opt out, so this isn't paying for capability the product doesn't need.

## Consequence
`apps/web` gains real framework tooling (routing, data loading, build config) in place of its current empty `package.json`. The SDK's TanStack Start adapter (not yet built) will eventually instrument this exact application — when that adapter work happens, `apps/web` becomes its first real integration test, not just a synthetic fixture.
