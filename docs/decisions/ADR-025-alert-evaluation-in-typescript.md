# ADR-025 — Alert Evaluation Runs in TypeScript (control-api), Not Go

## Status
Accepted

## Decision
The `new_issue` alert-evaluation poll loop (Step 8) runs as a TypeScript entry point inside `apps/control-api` (a new alert-evaluator script), not as the Go `cmd/alert-worker` binary scaffolded early in the project.

## Context
`cmd/alert-worker` has existed as an unimplemented `"Hello World!"` placeholder since the initial monorepo scaffold — never wired to anything real. Building the actual new-issue detection loop there would require Go to gain two capabilities it has never had:

1. **Write access to a control-plane table.** Recording a firing means writing to `alert_events`. ADR-022 is explicit: *"Bun/Drizzle remains the sole owner of writes and migrations to `projects` — Go never writes to control-plane tables."* Alert evaluation needs the same boundary respected, or a documented exception to it.
2. **Read access to `alert_rules`/`alert_events`** — tables Go has never touched. ADR-022's own precedent (`ProjectCredentialRepository`) is a narrow, single-purpose read; this would be a second, separate control-plane table Go now depends on.

Meanwhile `apps/control-api` already has full read/write Postgres access (Drizzle) and full ClickHouse read access — already used by `issues.ts`/`network.ts`/`sessions.ts`/`performance.ts`/`releaseHealth.ts` to do exactly the kind of ClickHouse aggregation new-issue detection needs. Everything the alert-evaluation loop needs already exists on the TypeScript side; nothing needs to exist on the Go side to build it.

## Rationale
Go was chosen for the data plane specifically for ingestion/worker's throughput-critical hot path (ADR-016) — events/sec at the edge, where a GC pause or a slow request matters. A low-frequency poll loop (evaluating alert rules every N seconds) has none of those throughput characteristics and gets no benefit from Go's performance profile. Building it in Go would mean either:

- Violating ADR-022's write boundary directly, or
- Standing up a new Bun-owned internal endpoint for Go to call (ADR-022's own *rejected* option 2 for ingestion, for latency-coupling reasons that don't even apply here since alert evaluation isn't latency-sensitive) — real new infrastructure for no clean win, just to keep the logic in Go.

Building it in TypeScript needs zero new infrastructure: the same Drizzle client (`db/client.ts`), the same ClickHouse client (`db/clickhouse.ts`), and one new `fetch()` call for webhook delivery.

## Consequence
`cmd/alert-worker` remains an unimplemented placeholder (same status as `cmd/retention-worker`) — reserved for a future alert type that genuinely needs Go's throughput characteristics (e.g., a high-frequency anomaly-detection pass over raw events), not used for `new_issue`. `apps/control-api` gains a new alert-evaluator entry point (a script run on an interval, not an HTTP route) sharing `db/client.ts` and `db/clickhouse.ts` with the rest of control-api.

Revisit if alert evaluation volume/frequency ever grows enough to need Go's performance characteristics, or if a future alert type's detection logic is naturally Go-shaped (e.g., something that piggybacks on the worker's existing per-event processing instead of polling).
