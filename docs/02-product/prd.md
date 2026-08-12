# FrontWatch — Product Requirements

**Status:** Draft · Consolidates: PRD + the business-requirement layer of BRD (legacy `03-business-analysis/brd.md` + `04-product-requirements/prd.md`)

## 1. Product definition

FrontWatch is a self-hosted frontend observability and reliability platform for organizations that need deep visibility into production web applications while retaining control over telemetry. Core workflow every feature must strengthen: **Production → Telemetry → Detection → Issue → Investigation → Root Cause → Fix → Release → Verification.**

## 2. Users & their goals

| User | Goals |
|---|---|
| Software Engineer (primary) | Find errors, understand what happened, reproduce with production context, identify affected customers/routes, understand network failures, identify problematic releases, verify fixes |
| DevOps/Platform Engineer | Monitor app health, configure applications/environments, configure alerts, monitor releases, operate FrontWatch, manage retention/infra |
| CTO/Eng. Leader | Understand app health, monitor reliability, understand customer impact, identify major incidents, understand release quality, build production confidence |

## 3. Business requirements this satisfies (BR-xxx, from the BRD)

| BR | Requirement |
|---|---|
| BR-001 | Enable organizations to monitor deployed frontend application health |
| BR-002/003 | Detect frontend runtime errors with sufficient context to investigate them |
| BR-004/005 | Associate events with sessions (where appropriate) and show affected-user population |
| BR-006/007 | Identify affected routes and browser/device patterns |
| BR-008/009 | Frontend network visibility and meaningful performance visibility |
| BR-010/011 | Associate behavior with releases; investigate deployment↔health correlation |
| BR-012/013 | Understandable application health representation; issue grouping to cut duplicate investigation |
| BR-014/015/016 | Alerting on defined conditions; unified investigation workflow; efficient search/filtering |
| BR-017/018 | Environment separation (dev/staging/production); org-permission-scoped access |
| BR-019/020 | Configurable retention; controls preventing inappropriate sensitive-data collection/exposure |
| BR-021/022/023 | Self-hosted deployment; framework independence; SPA/SSR/SSG/hybrid rendering independence |
| BR-024/025 | Low application performance impact; reliable telemetry collection and processing |

**Business rules (non-negotiable):** monitoring must never break the monitored app (BRULE-001) · don't collect sensitive data unnecessarily, default to the conservative option (BRULE-002/003) · conclusions shown to users must trace back to underlying telemetry (BRULE-004) · one org's telemetry must never be exposed to another (BRULE-005) · production must be a distinguishable, first-class environment (BRULE-006) · switching frontend frameworks must not require redesigning the monitoring strategy (BRULE-007) · health is a synthesized signal, not a raw error count (BRULE-008).

## 4. Functional requirements by capability

| Capability | Key requirements |
|---|---|
| **Application management** | Create/view/configure/deactivate an application; unique ID per app; multi-environment support |
| **Environments** | Create environments (dev/staging/production minimum); telemetry tagged by environment; filterable by environment; production clearly identifiable |
| **SDK / instrumentation** | Initializes in-app; identifies application/environment/release; captures supported telemetry; batches; supports sampling, filtering, redaction; **SDK failure must never cause application failure** |
| **Error monitoring** | Capture unhandled JS exceptions and unhandled promise rejections; associate with app/release/session context; viewable message, stack trace, contextual metadata |
| **Issue management** | Group related events into issues (not N independent alerts); show occurrence count, affected sessions/routes/releases, first/last seen; resolve and reopen |
| **Breadcrumbs** | Timestamped chronological events leading to an incident; associated with sessions; visible during investigation; respects privacy config |
| **Session context** | Session identifier generated/received; relevant telemetry (navigation, interaction, network, performance, breadcrumbs, errors) attached to it; chronological view during investigation; sensitive info not collected unnecessarily |
| **User context** | Anonymous vs. authenticated user distinguished; identification optional and privacy-controlled; pseudonymous IDs preferred over PII |
| **Navigation** | Capture navigations with timestamps, tied to sessions; identify affected routes |
| **Network monitoring** | Method/URL/status/duration/timestamp/type/size/failure-state per request; tied to page/session where possible; inspect failed/slow requests; identify APIs behind failures; **no sensitive payloads captured by default** |
| **Performance monitoring** | LCP/CLS/INP/FCP, navigation timing, resource timing, long tasks, route-transition performance; tied to app/route; identify slow routes and changes over time; correlate with releases |
| **Release tracking** | Register releases; tag telemetry with release where available; health-by-release view; compare releases; investigate release↔issue correlation |
| **Deployment awareness** | A release ≠ a deployment — the same release can be deployed to multiple environments; both must be modeled |
| **Application health** | High-level "is my app healthy?" view (errors, performance, network failures, affected sessions, release health); filterable by environment; trend over time; links to underlying evidence |
| **Alerts** | Configure conditions and notification destinations; categories: new issue, error spike, performance degradation, health degradation, release regression; alert contains enough context to start investigating; avoid duplicate alerts |
| **Investigation** | The core surface — open an issue and progressively answer what happened → who was affected → where → when it started → what changed → likely cause; shows summary, occurrence trend, affected sessions/routes/browsers/devices, breadcrumbs, network, release, performance; navigable into related telemetry |
| **Search & filtering** | Filter telemetry/issues by time range, environment, application, release, route, browser/device |
| **Organizations / projects** | Org owns users/projects/applications/permissions; projects can be created/configured/viewed, environments configured, SDK config generated |
| **Access control** | Minimum roles: Administrator, Engineer, Viewer (full permission model designed later) |
| **Privacy** | Configurable collection, sensitive-data filtering, SDK-level redaction, no unnecessary payload capture by default, retention controls |
| **Framework support** | React, Next.js, React Router, Remix, TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart — monitoring model stays consistent regardless of framework |
| **Rendering modes** | SPA, SSR, SSG, hybrid — architecture distinguishes browser-side telemetry from SSR context where needed |
| **Self-hosted operation** | Deployable within customer-controlled infrastructure end to end (app → FrontWatch → customer-controlled storage) |
| **Telemetry ingestion & reliability** | Browser → SDK → Ingestion API → Processing → Storage; batching, retries, backpressure, sampling, queueing, failure isolation |

## 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 Reliability | Reliable enough to serve as a trusted production monitoring system |
| NFR-002 Fault isolation | Monitoring failures must never cause monitored-application failures |
| NFR-003 Performance | Minimal SDK impact on the monitored application |
| NFR-004 Security | Telemetry and platform data protected against unauthorized access |
| NFR-005 Privacy | Minimize unnecessary collection of sensitive data |
| NFR-006 Scalability | Support increasing telemetry volume |
| NFR-007 Observability | FrontWatch monitors itself — health, ingestion rate, dropped events, processing latency, storage health, query latency, internal errors |
| NFR-008 Maintainability | New framework integrations without redesigning the core telemetry model |
| NFR-009 Extensibility | Telemetry model supports future event types |
| NFR-010 Deployment flexibility | Supports customer-controlled deployment models |

## 6. Product navigation (conceptual IA)

```
FrontWatch
├── Overview            (is my application healthy? — health, error trend, affected users, performance trend, recent issues/releases, active alerts)
├── Issues (All / Unresolved / Resolved)
├── Performance
├── Sessions
├── Releases
├── Alerts
└── Settings (Project, Environments, SDK, Privacy, Team, Retention)
```

Key screens and the question each answers: **Issue detail** — "what happened?" (summary, occurrence trend, impact, stack trace, breadcrumbs, sessions, network, performance, release, browser/device, timeline). **Session view** — "what happened to this user during this session?" **Release view** — "how is this version behaving?" **Performance view** — "where is the application becoming slow?"

## 7. Onboarding flow

Create account → create organization → create project → choose framework → install SDK → send telemetry → verify installation (SDK detected / events received / environment identified / release identified / test event received) → view application health. The user should never need to understand FrontWatch's internal architecture to get through this.

## 8. Product quality principles

Evidence over guessing · context over isolated events · signal over noise · privacy by default · framework agnostic · reliability first (a monitoring platform must itself be trustworthy) · investigation first (optimize for time-to-understanding, not data volume collected).

## 9. Metrics

**Primary:** Time to Understanding (TTU) — problem occurs → engineer becomes aware → engineer understands likely cause. Deliberately not "number of errors collected." **Secondary:** MTTD, MTTU, MTTR, issue recurrence rate, alert actionability, telemetry ingestion reliability, SDK overhead, release-regression detection rate. (Full North Star + goal tree lives in `01-project/strategy.md` §6.)

## 10. Open product questions

Not yet resolved — to be closed by discovery/UX/data-modeling/architecture work, not guessed:
PQ-1 exact default-captured telemetry · PQ-2 what must never be captured · PQ-3 issue-grouping algorithm · PQ-4 application-health calculation · PQ-5 what makes an alert "actionable" · PQ-6 acceptable session-context depth from a privacy standpoint · PQ-7 exact self-hosted deployment model · PQ-8 minimum supported browser matrix · PQ-9 exact framework integrations in the first release · PQ-10 SDK performance budget numbers.

## 11. Requirement traceability

`Business Problem → Business Requirement (BR-xxx) → Product Requirement (FR-xxx, this doc) → Epic → User Story → Acceptance Criteria → UX Workflow → UI → Technical Requirement → Architecture → Implementation → Test`. Every feature should be traceable up this chain; see `03-business-analysis/epics.md` for the next link.
