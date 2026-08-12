# FrontWatch — Risk Register

**Status:** Draft · Consolidates: legacy `21-engineering-tasks/engineering-risks.md` + `20-engineering-roadmap/risk-register.md`. **One canonical copy** — the legacy docs had this duplicated with diverging content across two folders (`20-engineering-roadmap/risk-register.md` and `21-engineering-tasks/risk-register.md`); this is the merge. Product/business risks live in `../01-project/charter.md` §18 and `../03-business-analysis/brd.md` — this register is delivery/engineering-specific.

| ID | Risk | Mitigation |
|---|---|---|
| R01 | Too many tasks scheduled before the first demo | Protect the first vertical slice (`execution-roadmap.md` §1); resist scope creep before it exists |
| R02 | API/event contract drift between independently developed components | Shared contracts + contract tests (`../06-engineering-specs/README.md`, `../05-architecture/api-contracts.md` §15) |
| R03 | SDK framework-compatibility explosion | Maintain an explicit, tested support matrix (`../06-engineering-specs/sdk/instrumentation.md` §6) rather than an open-ended promise |
| R04 | Data plane over-engineered before load is understood | Start with a small number of Go components and benchmark before adding more |
| R05 | Control-plane/data-plane boundary blurs over time | Maintain the Bun/Go ADR ownership boundaries (`../decisions/ADR-016`, `ADR-017`) as a living constraint, not a one-time decision |
| R06 | Security work added late, as a final pass | Embed security work into every epic from the start, not as a hardening phase bolted on at the end |
| R07 | Testing delayed to "later" | Testing is part of feature completion, not a final phase — enforced by the Definition of Done |
| R08 | Telemetry volume exceeds design assumptions | Load tests, quotas, sampling, backpressure, horizontal scaling (`../05-architecture/system-architecture.md` §12) |
| R09 | Query performance degrades under real investigation load | Profiling, aggregation, indexes driven by the query matrix, result limits (`../05-architecture/data-model.md` §5-6) |
| R10 | SDK overhead harms the monitored application | Explicit performance budgets, asynchronous transport, continuous benchmarking (`../06-engineering-specs/sdk/quality-and-release.md`) |
| R11 | Tenant isolation failure | Defense in depth + automated isolation test suite, run on every security-sensitive change (`test-strategy.md` §Tenant isolation) |
| R12 | Self-hosting proves too operationally complex for target customers | Deployment profiles, modular-first architecture, small-installation path that doesn't require a large cluster (`../05-architecture/system-architecture.md` §13) |
