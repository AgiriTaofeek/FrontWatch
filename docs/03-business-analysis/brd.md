# FrontWatch — Business Requirements

**Status:** Draft · Consolidates: legacy `03-business-analysis/brd.md`. The BR-xxx requirement list and business rules now live in `02-product/prd.md` §3 (to avoid a second copy); business assumptions live in `01-project/problem.md` §7. This document covers what's specific to the business layer: objectives, stakeholders, process transformation, constraints, risks, and success criteria.

## Executive summary

Organizations operating customer-facing web applications need to know whether those applications are functioning correctly for customers — particularly for business-critical applications such as banking platforms. Today, engineering teams often discover frontend problems only after: customer experiences it → reports it → support investigates → engineering receives the report → developer attempts reproduction → developer searches multiple systems → root cause identified → fix implemented → deployed → verified. This introduces significant delay between *problem occurs* and *problem is understood/resolved*.

FrontWatch provides a private, self-hosted frontend observability platform that continuously understands the health and behavior of production web applications, so engineers/DevOps/CTOs can answer: is the application working, are errors increasing, are customers experiencing failures, which pages/APIs are failing, is it becoming slower, did the latest deployment cause a problem, which users/browsers/devices are affected, are there security problems. **Business objective: move frontend reliability from a reactive, customer-reported process toward proactive detection and investigation.**

## Business objectives

| ID | Objective |
|---|---|
| BO-01 | Improve production awareness — know what's happening without waiting for customer reports |
| BO-02 | Reduce incident investigation time — less time reconstructing what happened |
| BO-03 | Improve production reliability — identify failures and regressions earlier |
| BO-04 | Improve release confidence — know whether a deployment negatively affected health |
| BO-05 | Improve customer experience — reduce duration and frequency of customer-facing problems |
| BO-06 | Preserve data control — organizations retain meaningful control over production telemetry |
| BO-07 | Support regulated environments — architecture and operating model appropriate for strict security/privacy requirements |

## Stakeholders

| Stakeholder | Primary concern |
|---|---|
| Software Engineer | Debugging — detect errors, investigate issues, understand sessions, inspect network failures/releases, identify affected users |
| DevOps / Platform Engineer | Reliability & operations — app health, deployment visibility, alerting, infra integration, retention, configuration |
| CTO / Eng. Leadership | Business/application reliability — health, reliability trends, incident visibility, release confidence, customer impact |
| Support | Customer-reported issues (not an initial primary user, but the business process must eventually account for them) |
| Security | Data protection |
| Platform team | Infrastructure |
| Product team | Product reliability |

Initial scope focuses on Software Engineers, DevOps, and CTO/Leadership (see `01-project/strategy.md` §3 for the full buying-committee model).

## Process transformation

| Current state | Future state |
|---|---|
| Customer reports issue | System detects issue |
| Manual reproduction | Production context available |
| Fragmented evidence | Correlated telemetry |
| Reactive | Proactive |
| Unknown impact | Visible impact |
| Unknown release relationship | Release correlation |
| Manual verification | Continuous monitoring |
| Multiple investigation tools | Unified investigation workflow |

**Current-state flow:** problem occurs → customer notices → customer reports → support receives → engineering receives → reproduction attempt (failed → more investigation) → evidence gathering → root cause identified → fix → deploy → verify.

**Future-state flow:** problem occurs → FrontWatch observes → problem detected → engineering notified → context available → investigation → likely cause identified → fix → deploy → FrontWatch monitors the release → recovery verified. **The customer report becomes an exception, not the primary detection mechanism.**

## Business constraints

| ID | Constraint |
|---|---|
| BC-001 | Sensitive data — banking/regulated applications may process sensitive customer information, creating strict telemetry collection/storage constraints |
| BC-002 | Self-hosted deployment — architecture must support environments where telemetry cannot leave customer infrastructure |
| BC-003 | Production reliability — monitoring must be trustworthy enough to rely on during actual incidents |
| BC-004 | Browser environment — the system operates within a constrained browser sandbox; cannot assume unrestricted access to application internals |
| BC-005 | Multiple frameworks — must account for different frontend frameworks and rendering models |
| BC-006 | SDK overhead — the monitoring client must not materially degrade application performance |
| BC-007 | Telemetry volume — frontend applications can generate significant volume; must handle high ingestion rates efficiently |

## Business risks

| Risk | Impact | Response |
|---|---|---|
| Existing solutions are already considered sufficient | High | Establish clear differentiation around privacy, self-hosting, frontend depth, investigation quality, regulated-environment fit (see `01-project/strategy.md` §4) |
| Customers unwilling to take on self-hosting's operational responsibility | High | Consider multiple deployment models over time while preserving customer data control |
| Improper telemetry collection exposes sensitive information | Critical | Privacy must influence the architecture from the beginning, not be bolted on |
| SDK negatively affects application performance | High | Explicit performance budgets, sampling, async processing, continuous benchmarking |
| Excessive alert/event noise erodes trust | High | Prioritize signal quality over signal volume |
| Scope explosion — attempting to replace Sentry + Datadog + PostHog + Grafana + APM + SIEM + incident management simultaneously | Critical | Protect the MVP boundary (`02-product/mvp.md`) |

## Business value chain

`Telemetry → Visibility → Detection → Understanding → Faster Resolution → Less Customer Impact → Higher Application Reliability → Higher Customer Trust.` For a financial application specifically, this chain connects directly to customer transactions, customer trust, operational cost, support volume, revenue, brand reputation, and regulatory exposure.

## Business success criteria

Customers detect meaningful frontend problems before customer reports · engineers spend less time investigating production frontend problems · teams can identify affected users and application areas · teams can identify release-related regressions · customers trust the telemetry · customers can operate the platform without surrendering unnecessary telemetry control · the monitoring system itself remains reliable.

## Business scope

**MVP:** application monitoring, error monitoring, session context, network monitoring, performance monitoring, release awareness, issue grouping, application health, alerting, investigation, privacy controls, self-hosted deployment. **Future:** advanced anomaly detection, regression intelligence, session replay, reliability budgets, AI investigation, root cause analysis, frontend security monitoring, enterprise governance, compliance controls, advanced deployment intelligence, automated reliability gates. **Explicitly out of scope:** full backend observability, infrastructure monitoring, full product analytics, full SIEM, full incident-management replacement, general-purpose log management, general-purpose APM (though integrations with these systems may still be valuable).

## Traceability

`Business Problem → Business Requirement (BR-xxx, in prd.md §3) → Product Requirement (prd.md §4) → Epic (epics.md) → User Story (user-stories/) → Acceptance Criteria → UX Workflow (04-ux-ui/) → UI → Technical Requirement (05-architecture/, 06-engineering-specs/)`. Every feature should be traceable up this chain — it's what prevents features from appearing without a business reason.
