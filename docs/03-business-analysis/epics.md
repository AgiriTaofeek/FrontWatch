# FrontWatch — Epics

**Status:** Draft · Source: legacy `05-user-requirements/epics.md`. Hierarchy used throughout: `Business Requirement → Product Requirement → Epic → Feature → User Story → Acceptance Criteria → UX Workflow → UI → Technical Requirement`. See `user-stories/` for the story-level breakdown of each epic below.

## Epic map (all P0 for MVP — see caveat)

| ID | Epic | Purpose | Primary BR (from `brd.md`) |
|---|---|---|---|
| E01 | Organization & Access Management | Foundational org model: who can access FrontWatch, which applications, what actions. Core: organization, users, teams, roles, permissions, auth, project access. Future: SSO, SAML, SCIM, advanced RBAC. | BR-018 |
| E02 | Application & Environment Management | Register/manage monitored applications and their environments (e.g. `Banking Web / Development, Staging, Production`) | BR-001, BR-017 |
| E03 | SDK & Application Instrumentation | The mechanism through which FrontWatch observes frontends. Core: init, app/env/release identification, capture, sampling, filtering, redaction, offline/failure handling. **Key requirement: framework-independent at its core.** | BR-022, BR-024 |
| E04 | Telemetry Ingestion | Reliably receive telemetry: event ingestion, validation, auth, batch processing, dedup, rate limiting, sampling, backpressure | BR-025 |
| E05 | Error Monitoring | Detect frontend runtime failures: exceptions, promise rejections, browser/console errors, stack traces, metadata, grouping | BR-002, BR-003 |
| E06 | Session & User Context | Context around the experience that produced an issue: session identification, timeline, anonymous sessions, optional user ID, affected-session analysis | BR-004, BR-005 |
| E07 | Breadcrumbs & Event Timeline | Chronological evidence leading to an incident: capture, timestamping, categorization, timeline visualization, context linking, privacy filtering | BR-003, BR-015 |
| E08 | Network Monitoring | How the app talks to APIs/external resources: which APIs are failing, which requests are slow, which routes/users are affected, did it start after a release | BR-008 |
| E09 | Performance Monitoring | Detect frontend performance degradation: LCP/CLS/INP/FCP, navigation/resource timing, long tasks, route performance | BR-009 |
| E10 | Release & Deployment Intelligence | Connect application behavior to software releases: what's running, when deployed, did it introduce errors/perf changes, which environment | BR-010, BR-011 |
| E11 | Issue Management | Raw events → actionable engineering issues: grouping, dedup, status, occurrence count, affected users/routes, first/last seen, resolution, reopening | BR-013 |
| E12 | Application Health | High-level "is my application healthy right now?" across errors, performance, network, affected users, release health | BR-012 |
| E13 | Alerting | Proactively notify on conditions requiring attention: new issue, error spike, performance degradation, health degradation, release regression. Future: anomaly detection, reliability-budget breach, predictive alert, customer-impact threshold | BR-014 |
| E14 | Investigation & Correlation | The core workflow for understanding production problems: what/who/where/when/what-changed/which-release/what-evidence | BR-015 |
| E15 | Search & Filtering | Navigate large telemetry volumes: time, application, environment, release, issue, route, browser, device. Future: user, region, custom tags, feature flags, experiments, network | BR-016 |
| E16 | Privacy & Data Controls | Protect customer/application data — especially important for the regulated target market: redaction, event filtering, sampling, sensitive-field exclusion, retention policies, collection controls. **Core principle: the customer controls what FrontWatch is allowed to observe.** | BR-020 |
| E17 | Self-Hosted Operations | Run FrontWatch inside customer-controlled infrastructure: installation, configuration, upgrades, storage/retention configuration, health checks, backup, operational monitoring | BR-021 |
| E18 | Framework Integrations | First-class integration for each supported frontend technology (React, Next.js, React Router, Remix, TanStack Start, Vue, Nuxt, Svelte, SvelteKit, Solid, SolidStart) as thin adapters over the core instrumentation | BR-022, BR-023 |
| E19 | FrontWatch Platform Observability | Monitor FrontWatch itself: ingestion rate, dropped events, processing latency, queue depth, storage health, API/query latency, internal errors, SDK delivery failures. A monitoring platform that cannot reliably monitor itself cannot be fully trusted. | BR-025 |

## MVP-critical chain vs. cross-cutting

The **critical path** for the first end-to-end MVP: `E02 Application → E03 SDK → E04 Ingestion → E05 Errors → E06 Sessions → E07 Breadcrumbs → E08 Network → E10 Releases → E11 Issues → E14 Investigation`.

**Cross-cutting, applies throughout:** E01 Access, E09 Performance, E12 Health, E13 Alerts, E15 Search, E16 Privacy, E17 Self-hosting, E18 Frameworks, E19 Platform observability.

> **Caveat carried over from the legacy docs review:** the epic table above marks all 19 epics P0, which is broader than the actual build-gate slice in `02-product/mvp.md` §1 (which is intentionally just E03+E04+E05+E11+E14, narrowly). Treat the critical-path chain above, not "P0" on every row, as the real priority signal — the MVP definition (`02-product/mvp.md`) and the individual `user-stories/E*.md` P0/P1 tags are the actual source of truth for what ships first.

## Dependency graph

```
E01 Organization → E02 Application → E03 SDK → E04 Ingestion
                                                    │
                                        ┌───────────┼───────────┐
                                        ▼                       ▼
                                    E05 Errors              E06 Sessions
                                        │                       │
                                        └───────────┬───────────┘
                                                     ▼
                                              E07 Breadcrumbs
                                                     │
                                  ┌──────────────────┼──────────────────┐
                                  ▼                  ▼                  ▼
                            E08 Network      E09 Performance      E10 Releases
                                  │                  │                  │
                                  └──────────────────┼──────────────────┘
                                                      ▼
                                                 E11 Issues → E12 Health → E13 Alerts → E14 Investigation → E15 Search
```

**Critical dependency:** `Telemetry → Context → Correlation → Investigation`. If the telemetry data model is poorly designed, the investigation experience will be poor no matter how good the UI is — see `05-architecture/data-model.md`. Data modeling is not an implementation detail here.

## Epic success principle

An epic is successful only when it contributes to the full reliability workflow, not when its narrow function works in isolation. E.g. Error Monitoring isn't "done" because errors are stored — it's done when `Error → Detected → Grouped → Contextualized → Investigated → Resolved` actually works end to end.
