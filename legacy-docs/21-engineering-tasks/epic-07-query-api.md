# E07 — Query API

Runtime: **TypeScript + Bun**

## Health
Return error rate, active issues, network failures, performance signals, affected sessions, latest release, and freshness.

## Issues
Support search, filters, sorting, pagination, time range, environment, release, and route.

## Issue Detail
Return summary, occurrences, trends, affected releases/routes/browsers/devices, sessions, and network context.

## Sessions
Support lookup, event timeline, time-window filtering, and incremental loading.

## Performance
Support Web Vitals, route metrics, release comparisons, browser/device dimensions, and aggregation.

## Network
Support resource search, failures, latency, status distribution, and dimensions.

## Releases
Support release metadata, deployment markers, and health comparison.

**Acceptance:** all APIs enforce authorization, tenant scope, query limits, pagination, and safe errors.
