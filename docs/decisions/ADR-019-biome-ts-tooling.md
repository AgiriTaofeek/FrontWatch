# ADR-019 — Biome for TypeScript Linting & Formatting

## Status
Accepted

## Decision
Use [Biome](https://biomejs.dev) for linting and formatting across all TypeScript/Bun packages (`apps/web`, `apps/control-api`, `packages/*`), rather than ESLint + Prettier.

## Rationale
Biome is a single Rust-based tool that performs both linting and formatting, replacing the two-tool ESLint+Prettier combination (which additionally needs `eslint-config-prettier` to stop the two from fighting over formatting rules). It's substantially faster and needs one config file instead of two. The tradeoff: ESLint's plugin ecosystem is still larger for niche/custom rules, which matters more at large-team scale than for FrontWatch's current stage. Go tooling is unaffected by this decision — `golangci-lint` remains the Go-side choice, decided independently.

## Consequence
If a specific lint rule gap becomes a real problem later (a rule only ESLint's plugin ecosystem covers), that's a scoped, well-justified reason to revisit — not a reason to default to the heavier two-tool setup now.
