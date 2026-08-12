# FrontWatch — MVP (the build gate)

**Status:** Draft · Consolidates: mvp-strategy.md, legacy mvp-definition.md, first-vertical-slice.md

> **This is the mandatory build-gate document** (see `FORMULA.md` §4). Before going deep on `05-architecture/` or `06-engineering-specs/` beyond what this defines, this smallest end-to-end slice should actually get built.

## 1. The smallest end-to-end slice (build this first, before anything else)

> A developer deploys a small frontend, intentionally throws an error, and sees the grouped issue in FrontWatch.

```
Frontend error → SDK → Go ingestion → Redpanda → Go processor → storage → Bun API → dashboard issue
```

Scope: SDK initialization, error capture, ingestion, queue, processing, fingerprinting, persistence, issue API, issue list, issue detail. **Explicitly deferred even from this slice:** advanced performance, session replay, complex alert rules, custom dashboards, ML anomaly detection, broad integrations.

## 2. MVP hypothesis

> If FrontWatch continuously collects meaningful frontend telemetry and correlates errors, sessions, network activity, performance, and releases into a single investigation workflow, engineers will detect and understand production frontend problems faster than with their existing workflow.

Five things the MVP must prove: (1) can we reliably collect frontend telemetry? (2) can we detect meaningful application problems? (3) can we connect a problem to useful context? (4) can an engineer understand what happened without manually reconstructing the incident? (5) can we tell whether a deployment contributed to the problem?

## 3. The golden MVP scenario (what "done" looks like)

Engineer deploys release 4.2.0 → user navigates to `/transfer` → API request fails → frontend throws → FrontWatch captures → issue created → engineer receives alert → opens issue → sees affected users, affected route, the API failure, and release 4.2.0 → investigates the release → fixes → deploys 4.2.1 → FrontWatch observes recovery. If this works well end to end, the product has demonstrated its core value.

## 4. MVP capabilities

### Platform
Self-hosted deployment · authentication · organizations/projects · applications/environments · RBAC (Administrator/Engineer/Viewer)

### SDK
Errors (JS exceptions, unhandled promise rejections) · network · performance (basic) · navigation · sessions · breadcrumbs · privacy/redaction · release context. Framework-independent core with thin adapters (see `06-engineering-specs/sdk/`).

### Dashboard
Health · issues · issue investigation (the single most important surface) · sessions · performance · network · releases/deployments

### Operations
Alerts (new issue, error spike, performance degradation, health degradation) · internal observability (FrontWatch monitors itself) · backups · security controls

**P0 vs. later** — P0 is everything above. P1 (important shortly after MVP): advanced performance analytics, advanced alert rules, more framework integrations, session replay, advanced release comparison, custom dashboards, more notification integrations. P2 (later): AI investigation, predictive anomaly detection, frontend security monitoring, advanced user journeys, advanced SLOs, automated root-cause analysis, cross-application intelligence.

## 5. Framework rollout order

Don't build N separate SDKs at once — one core + adapters. **Tier 1: React, React Router, and TanStack Start.** **Tier 2:** Next.js, Remix, SolidStart. **Tier 3:** Vue, Nuxt, Svelte, SvelteKit, Solid (bare).

**Why these three lead:** React Router and TanStack Start both toggle between SPA and SSR from the *same codebase*, and both expose an explicit, first-class server-execution boundary the SDK must never straddle — React Router Framework Mode via a binary `ssr: true`/`false` config plus **Loaders** (server data-fetch before render) and **Actions** (server-side mutations); TanStack Start via a *three-way, per-route* `ssr: true` (full SSR+hydrate) / `"data-only"` (loader runs server-side, component renders client-only) / `false` (pure SPA, no server execution) toggle plus **Server Functions** (type-safe client↔server RPCs addressed by stable generated IDs embedded in both the client and SSR builds). Getting the browser/server instrumentation boundary right for these two — including the `data-only` middle case, which is neither "fully SSR" nor "fully SPA" — is the hardest version of the problem every other meta-framework adapter also has to solve, so it's the right place to prove the adapter pattern first.

**Bare React ships alongside them, in Tier 1, not after them** — both React Router and TanStack Start are React underneath, so the error-boundary integration, component lifecycle hooks, and rendering instrumentation built for either one *is* the React adapter. Shipping bare React separately from Tier 1 would mean either duplicating that work or artificially delaying a framework that's already done by the time the other two are.

Validate this ordering against actual target customers before committing engineering time to Tier 2/3 — the architectural goal is that adding a framework requires an adapter, not a redesign. See `06-engineering-specs/sdk/instrumentation.md` §Framework support matrix for the per-framework SSR-mode detail this ordering is based on.

## 6. Explicit MVP non-goals

Not a full APM/infrastructure/database/Kubernetes monitoring replacement · not a full log platform (ELK/Splunk/Datadog Logs) · not a full analytics platform (funnels/cohorts/marketing analytics) · not a full security platform/SIEM · not an incident-management platform (integrate with Slack/PagerDuty/Jira/Linear rather than rebuild them) · not an AI platform · **not session-replay-first** — it adds privacy complexity, storage cost, SDK complexity, and sensitive-data risk; a breadcrumb + session-timeline model should be enough to validate the core workflow first.

## 7. MVP success criteria

Installation succeeds on a real application without unreasonable effort · telemetry reaches the customer's installation reliably · real production problems are detected · engineers see meaningful context around them · engineers can investigate without manually reconstructing the incident · engineers can tell whether a recent deployment is associated with a regression · meaningful performance degradation is identifiable · sensitive telemetry can be controlled and protected · FrontWatch doesn't materially affect the monitored application's performance · pilot engineers report a meaningful reduction in investigation time.

The MVP is **not** done when "SDK works, API works, dashboard works." It's done when a real frontend problem is captured → detected → contextualized → investigated → correlated with a release → resolved → verified, by a real engineer, using the system.

## 8. Validation experiments (run before declaring MVP complete)

1. **JavaScript regression** — introduce a production-like JS error → confirm capture → issue creation → engineer signal → context available.
2. **API failure** — cause a request to fail → confirm frontend behavior, session context, and error all connect into one issue.
3. **Performance regression** — introduce one → confirm anomaly detection and affected route/release surface correctly.
4. **Bad deployment** — deploy a release with a regression → confirm health change, error/performance increase, and release correlation all show up.
5. **Customer impact** — create a problem affecting only a subset of browsers/devices/routes/regions → confirm the engineer can determine the affected population.

## 9. MVP risks & mitigations

| Risk | Mitigation |
|---|---|
| Scope explosion (becomes Sentry+Datadog+Grafana+PostHog+security+AI) | Protect the core workflow; anything that doesn't strengthen Detect→Context→Investigate→Release-awareness→Customer-impact→Verify gets questioned |
| Too much telemetry (cost, privacy risk, noise, storage complexity) | Start with meaningful signals, not maximum collection |
| Weak correlation (data arrives but can't be connected) | Design the data model around relationships from the start — see `05-architecture/data-model.md` |
| Poor signal quality / alert fatigue | Invest in grouping, deduplication, thresholds, anomaly detection |
| SDK performance overhead | Explicit performance budgets, continuous benchmarking (see `01-project/problem.md` A11) |
| Privacy (sensitive data enters telemetry) | Privacy-by-default architecture, not a settings-page afterthought |
| Building for the wrong customer | Anchor decisions to the ICP in `01-project/strategy.md` §3 |

## 10. MVP principle

> The MVP is not "frontend monitoring." It is a complete production investigation workflow for frontend incidents.

The behavioral change being targeted: when something goes wrong in production, the engineer's first question should become "what does FrontWatch show me?" — not "how do I reproduce this?"
