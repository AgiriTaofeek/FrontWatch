# FrontWatch — Test Strategy

**Status:** Draft · Consolidates all of legacy `17-testing-and-quality/` (test-strategy, test-pyramid, release-quality-gates, tenant-isolation-tests, load-testing, security-testing, sdk-testing, framework-compatibility, quality-risks, telemetry-volume-testing, data-correctness, plus the remaining API/accessibility/visual-regression/upgrade/DR/contract/failure files at a lighter level of detail)

## Quality dimensions

Correctness, security, reliability, performance, compatibility, accessibility, data integrity, operability, upgrade safety. **Testing principle: the monitoring platform must remain useful during the exact conditions it's designed to observe** — customer incident, high error rate, traffic spike, telemetry spike, slow APIs, deployment regression, dependency failure. A test suite that only proves FrontWatch works when everything is calm hasn't proven the thing that matters.

## Test pyramid

| Layer | Volume | Covers |
|---|---|---|
| **Unit** (base) | Large, fast | Domain rules, fingerprinting, redaction, sampling, validation, formatters |
| **Integration** (middle) | Moderate | Database, queue, storage, API, processing pipeline (`API → PostgreSQL`, `Worker → Redpanda → ClickHouse`) |
| **E2E** (top) | Small, high-value only | login → dashboard → issue investigation → session investigation → alert workflow |

Prefer the cheapest test that can prove the behavior — never turn a unit-level behavior into a slow browser test. **Contract tests** verify API/event contracts between independently developed components (SDK↔ingestion, dashboard↔control API) — see `../05-architecture/api-contracts.md` §15.

## Release quality gates

**Required before any production release:** build passes, unit tests pass, integration tests pass, contract tests pass, critical E2E passes, security scans pass, tenant isolation passes, migration tests pass. **Conditional, depending on the change:** load testing, SDK compatibility, framework matrix, visual regression, DR testing, upgrade testing. **Never release with an unresolved critical:** security vulnerability, data corruption, tenant isolation failure, critical ingestion failure, or unsafe migration. The final release decision weighs risk, impact, test evidence, known limitations, and the rollback plan together — not a single green checkmark in isolation.

## Tenant isolation tests (their own suite — failure here is catastrophic)

Create Organization A and Organization B with similar resources. From A, attempt to access B's application, environment, issues, sessions, performance, network data, releases, alerts, and source maps — **every attempt must fail.** An A ingestion credential must never be able to write telemetry into B. A user must never be able to export B's data. Run this suite on every security-sensitive backend change, automated, not manually before a big release.

## Load & telemetry-volume testing

Test normal traffic, peak traffic, incident spike, sustained high volume, and recovery after a spike — because **monitoring platforms tend to experience their own traffic spikes exactly when customer applications are failing**, which is the worst possible time to discover a capacity problem. Variables: events/sec, average event size, batch size, query concurrency, retention, worker count. Measure: ingestion latency, queue lag, processing throughput, storage latency, API latency, error rate, resource usage. Success at expected peak load: no uncontrolled memory growth, no unbounded queue growth, acceptable latency, no data corruption, and the platform fails predictably under overload rather than exhausting all resources. Generate error bursts, network-failure bursts, performance-event bursts, large sessions, and many simultaneous applications as concrete test scenarios; critical errors must remain observable even under volume pressure.

## Security testing

Categories: SAST, dependency scanning, secret scanning, DAST, penetration testing, authorization tests, tenant-isolation tests, fuzzing. Critical attempts to test for: cross-tenant access, credential escalation, SQL injection, XSS through telemetry, SSRF, oversized payload, malformed event. SDK-specific: verify sensitive values are actually redacted and untrusted content can never become executable content. Infrastructure: exposed services, RBAC, network policy, container permissions, secret access.

## SDK testing

The SDK is one of the highest-risk components because it runs *inside customer applications*. Test areas: initialization, error capture, fetch, XHR, navigation, performance, session, breadcrumbs, privacy, sampling, buffering, transport. Browser matrix: Chrome, Safari, Firefox, Edge. Failure tests: offline, blocked transport, unavailable ingestion, malformed configuration, missing browser APIs, full buffer. Performance: bundle size, startup overhead, CPU, memory, network overhead — every SDK release automatically compares key metrics against the previous release (regression gate, not a manual check).

## Framework compatibility testing

For every supported integration (React, Next.js, React Router, Remix, TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart) across SPA/SSR/SSG/hybrid: install, build, run, initialize, capture error, capture navigation, capture network, capture performance. Verify browser-only APIs are never executed during server rendering. Maintain a tested compatibility *range*, not a claim of support for every historical framework version ever released.

## Data correctness testing

Telemetry must never silently become incorrect during processing. Validate event count, event identity, timestamps, release association, environment, application, issue fingerprint, session association, and aggregates. Verify duplicate delivery doesn't inflate derived metrics where idempotency is required (ADR-009). The system must handle telemetry arriving out of order (realistic clock/network behavior). Verify configured sampling produces the expected approximate rate without violating privacy rules. Compare raw event fixtures against derived dashboard results to catch aggregation bugs before they reach a real investigation.

## Testing & quality risks

| Risk | Mitigation |
|---|---|
| Tests pass but production still fails | Realistic integration, load, and failure testing — not just happy-path coverage |
| Tenant isolation regression | Dedicated automated isolation suite, run continuously |
| SDK breaks customer applications | Framework compatibility matrix + real browser testing |
| Monitoring fails during the exact incident it should be observing | Telemetry-spike and failure testing specifically, not just steady-state load testing |
| Slow dashboard under real investigation load | Performance budgets + large-dataset tests |
| False health signal (looks healthy, isn't) | Data-correctness testing + explicit no-data/error/stale state testing |
| Unsafe upgrade for self-hosted customers | Upgrade and migration tests as a first-class suite |
| Security regression over time | Automated security gates in CI + periodic independent testing |
