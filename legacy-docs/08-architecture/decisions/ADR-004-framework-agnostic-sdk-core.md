# ADR-004 — Framework-Agnostic SDK Core

## Status

Accepted

## Decision

Build one browser instrumentation core and provide thin adapters for supported frameworks.

## Why

The product requirement is broad framework support.

Duplicating instrumentation logic per framework would create:

- inconsistent behavior
- duplicated bugs
- higher maintenance cost
- different privacy behavior

## Consequence

Framework packages should primarily adapt:

- lifecycle hooks
- routing
- framework-specific error boundaries
- framework-specific SSR/client boundaries

Core telemetry behavior remains centralized.
