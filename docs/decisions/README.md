# FrontWatch — Architecture Decision Records

**Status:** Active · This is the one place "why did we choose X" lives, per `FORMULA.md` §3. One file per decision, never rewritten — amendments point forward via `Status`. Merges the two separate ADR sequences that existed in the legacy docs (`08-architecture/decisions/` and `10-technology-stack/decisions/`) into a single numbered log so there's exactly one ADR-001, not two.

| ADR | Decision | Status |
|---|---|---|
| [001](ADR-001-modular-monolith.md) | Modular backend, not microservices, for MVP | Accepted |
| [002](ADR-002-control-and-telemetry-plane.md) | Separate control plane and telemetry plane | Accepted |
| [003](ADR-003-separate-ingestion-from-console-api.md) | Separate ingestion API from authenticated console API | Accepted |
| [004](ADR-004-async-telemetry-processing.md) | Process telemetry asynchronously | Accepted |
| [005](ADR-005-framework-agnostic-sdk-core.md) | Framework-agnostic SDK core, in TypeScript | Accepted |
| [006](ADR-006-sdk-failure-isolation.md) | SDK must fail open for the application | Accepted |
| [007](ADR-007-privacy-before-transmission.md) | Redact/filter sensitive data before transmission, client-side where possible | Accepted |
| [008](ADR-008-raw-vs-derived-data.md) | Keep raw telemetry and derived data conceptually distinct | Accepted |
| [009](ADR-009-idempotent-processing.md) | Prefer idempotent event processing over exactly-once delivery | Accepted |
| [010](ADR-010-investigation-drives-query-design.md) | Investigation workflows drive query architecture | Accepted |
| [011](ADR-011-postgresql-control-plane.md) | PostgreSQL for control plane | Accepted |
| [012](ADR-012-clickhouse-telemetry.md) | ClickHouse for telemetry analytics | Accepted, pending production benchmarks |
| [013](ADR-013-redpanda-streaming.md) | Redpanda for event streaming | Accepted as initial production candidate |
| [014](ADR-014-react-typescript-dashboard.md) | React + TypeScript for dashboard | Accepted |
| [015](ADR-015-kubernetes-production.md) | Kubernetes for enterprise deployment | Accepted as production target |
| [016](ADR-016-go-data-plane.md) | Go for the data plane | Accepted, amended by 017 |
| [017](ADR-017-control-plane-bun.md) | TypeScript/Bun for the control plane | Accepted, amends 016 |
| [018](ADR-018-elysia-control-plane-router.md) | Elysia as the control-plane HTTP router | Accepted |
| [019](ADR-019-biome-ts-tooling.md) | Biome for TypeScript linting & formatting | Accepted |

## Genuinely still open (not yet an ADR)

Carried over from the legacy architecture register, still accurate as of this writing: cache/ephemeral-state technology beyond the Valkey candidate in `05-architecture/tech-stack.md` (not yet load-tested), object storage vendor specifics, exact SDK package/module structure, exact frontend routing framework choice, and the self-hosted packaging format beyond Helm (e.g. an installer/CLI). These should become ADRs once resolved through technical evaluation and benchmarking — see the physical-model checklist in `05-architecture/data-model.md` §12 for what needs measuring first.
