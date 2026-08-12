# Monorepo Architecture

## Ownership

```text
apps/control-api → control-plane team
apps/web         → frontend
services/*       → data-plane
packages/sdk     → SDK
packages/contracts → cross-boundary contracts
infra/*          → platform
```

## Build Rules

- TypeScript packages use the workspace/package manager strategy selected for the repository.
- Go services remain normal Go modules/packages.
- Shared contracts must be versioned and validated.
- Services must not import implementation code from another runtime.

## Boundary

```text
TS/Bun ── contracts ── Go
```

Contracts cross the boundary; internal implementation does not.
