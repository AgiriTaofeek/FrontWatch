# ADR-018 — Elysia as the Control Plane HTTP Router

## Status
Accepted

## Decision
Use [Elysia](https://elysiajs.com) as the HTTP router/framework for `apps/control-api` (the Bun/TypeScript control plane), rather than Hono or raw `Bun.serve`.

## Rationale
`tech-stack.md` commits to Bun for the control plane runtime (ADR-017) but leaves the router unchosen. Elysia is built specifically for Bun's server rather than being runtime-agnostic, giving it tighter integration with Bun's own primitives, and provides end-to-end type inference from route definition through to response shape — useful for a service whose consumers (the dashboard, and future SDK-facing config endpoints) are also TypeScript. The alternatives considered:

- **Hono** — runtime-agnostic (Bun/Node/Workers/Deno), larger ecosystem/community, but gives up some Bun-specific optimization in exchange for portability FrontWatch doesn't currently need (the control plane is committed to Bun, not runtime-portable, per ADR-017).
- **Raw `Bun.serve`** — zero dependencies, maximum transparency, but pushes routing, validation, and response shaping back onto hand-rolled code with no ecosystem support.

## Consequence
`apps/control-api` depends on Elysia's plugin ecosystem and release cadence — an accepted cost, revisit if Elysia's maturity/maintenance trajectory changes materially. Route handlers should stay thin per `06-engineering-specs/control-plane/architecture.md`'s layering (`Router → Authentication → Authorization → Application service → Repository`) — Elysia handles the router layer only, not a replacement for that discipline.
