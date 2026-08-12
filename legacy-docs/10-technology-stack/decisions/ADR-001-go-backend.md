# ADR-001 — Go for Backend Services

## Status

Accepted, amended by [ADR-008](ADR-008-control-plane-bun.md) — scope narrowed from "backend services" to the **data plane**. The control plane runs on TypeScript/Bun instead.

## Decision

Use Go for FrontWatch data-plane services (ingestion, telemetry processing, workers).

## Rationale

FrontWatch is dominated by concurrent network I/O, telemetry ingestion, background processing, and storage access.

Go provides a strong combination of:

- concurrency
- operational simplicity
- low runtime overhead
- static typing
- strong tooling

## Consequence

The team should establish shared Go conventions before the codebase becomes large.
