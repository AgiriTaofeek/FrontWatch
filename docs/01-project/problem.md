# FrontWatch — Problem, Research & Assumptions

**Status:** Draft · Consolidates: problem-statement, research-findings, user-research, market-research, competitive-analysis, assumptions (legacy `01-discovery/`)

## 1. The core problem

> Engineering teams responsible for customer-facing web applications lack proactive, contextual, trustworthy visibility into deployed frontend behavior. Frontend failures and performance regressions can be discovered by customers first, while engineers spend significant time reproducing issues, switching between tools, correlating fragmented telemetry, and determining customer impact. This is especially significant for organizations that must strictly control sensitive production telemetry.

Because of this, teams struggle to: detect problems before customers report them; understand what customers actually experienced; reproduce production-specific failures; determine scope of impact; identify which release introduced a problem; detect performance regressions quickly; correlate frontend failures with network/backend behavior; distinguish real incidents from noise; and maintain control over sensitive telemetry.

## 2. Why reproduction is hard

A production event depends on dimensions unavailable on a developer machine: browser, OS, device, location, network, application state, user state, feature flags, release, backend response, timing, interaction sequence. So `developer environment ≠ customer environment`, and an error message alone (`TypeError at checkout.ts:123`) is insufficient — **production context is part of the bug.**

## 3. Problem decomposition

| Problem | Desired outcome |
|---|---|
| **A — Detection**: failures found via customer report, not by the system | System detects, engineering responds |
| **B — Context**: raw errors lack surrounding evidence | Rich, correlated context per event |
| **C — Correlation**: relevant info scattered across error monitoring, logs, APM, deployment system, analytics, support tickets | One correlated investigation surface |
| **D — Impact**: technical event count ≠ business/customer impact | Explicit affected-user/journey analysis |
| **E — Trust**: noisy alerts or missing telemetry destroy confidence in the whole system | Accurate, low-noise, available, private, explainable |

## 4. Who experiences it (jobs-to-be-done)

- **Software Engineer** — *"When a production frontend problem occurs, I want to understand exactly what happened and why, so I can fix it without spending hours reproducing it manually."* Priority order: accurate detection → fast investigation → high-quality context → root cause → user impact → release correlation → performance insight → trends → customization.
- **DevOps/SRE** — *"When the frontend behaves abnormally, I want to know quickly whether it's a real customer-impacting incident, so I can coordinate the right response without drowning in alerts."* Biggest visibility gap: infra + backend can look healthy while the frontend is broken, with no infra alert firing.
- **CTO/Eng. Leadership** — *"When I need to understand the health of our customer-facing applications, I want trustworthy production intelligence and clear customer impact, so I can make decisions about reliability, risk, and engineering investment."* Wants outcomes (health %, incidents, MTTR trend), not stack traces.

Role comparison (🔴 primary · 🟡 important · 🟢 useful · ⚪ low): error details/stack traces/session context are 🔴 for engineers, 🟡 for DevOps, ⚪/🟢 for CTO. Performance, release health, deployment correlation, application health, and customer impact are 🔴 for **all three**. Telemetry governance is 🟢 for engineers but 🔴 for DevOps and CTO.

**Shared workflow:** production event → FrontWatch detects → classify/group → determine impact → (engineer diagnoses / DevOps operates / CTO understands) → fix → deploy → verify health.

## 5. Competitive landscape — what is NOT a differentiator

Reviewed: Sentry, Datadog RUM, New Relic Browser, Grafana Faro, Elastic RUM, Highlight, PostHog.

**Eliminated as differentiators** (all are already table stakes across serious competitors):
- ❌ Self-hosted — Sentry already ships a full self-hosted distribution (Postgres, Redis, Kafka, ClickHouse, Snuba, Symbolicator, Nginx, Relay, SeaweedFS, Taskbroker...). "We are self-hosted" alone is not enough.
- ❌ Framework-agnostic — Elastic's RUM agent is explicitly framework-agnostic already.
- ❌ Error monitoring, performance monitoring, RUM, network monitoring, sessions, session replay, backend correlation, Web Vitals — essentially every serious competitor covers these.

**Real findings from the research:**
- New Relic/Datadog architecture makes the actual question **"who ultimately controls the telemetry infrastructure?"**, not "is the dashboard secure?" — telemetry pipeline destination is itself a product concern for regulated buyers.
- Sentry's self-hosted footprint shows that self-hosting a mature observability platform can become its own infrastructure project — **opportunity: deliver private frontend observability with dramatically lower operational complexity than self-hosting Sentry.**
- Grafana Faro validates SDK/backend separation and OTel-compatible transport as a workable architecture pattern, but is Grafana-Cloud-oriented by default — the differentiated question is whether the *entire* collect→process→store→analyze pipeline can be purpose-built for private deployment.
- Market is already moving from "telemetry collection" toward "proactive intelligence" (PostHog's AI-oriented workflows, etc.) — raw telemetry is becoming less valuable than actionable conclusions derived from it.

**Working competitive-gap hypotheses** (unvalidated):
- **Gap A — Regulated frontend observability**: stronger defaults for data minimization, telemetry ownership, PII controls, deployment isolation, auditability, data residency, private networking.
- **Gap B — Operationally simple self-hosting**: enterprise-grade frontend observability without needing an enterprise-grade observability team to run it.
- **Gap C — Frontend-first, not full-stack-first**: frontend is the primary domain; backend/infra are integrated with, not replaced.
- **Gap D — Deployment-aware intelligence**: release, deployment, frontend health, and user impact treated as first-class connected concepts from day one.

**Positioning conclusion:** lead with *frontend production intelligence* — detect / explain / verify — not "self-hosted Sentry." Self-hosting and privacy are supporting characteristics, not the whole identity. See `strategy.md` for the full positioning statement.

## 6. Research findings (synthesis)

1. Frontend health is much larger than errors — it spans reliability, performance, and security together.
2. The browser is itself a production environment (its own runtime/memory/network/rendering/storage/security model); backend-healthy ≠ frontend-healthy.
3. Reproduction is a core, evidenced problem — production context is part of the bug.
4. Context must be correlated (user → session → page → interaction → network → error → performance → release → backend), not stored as independent events.
5. Telemetry collection alone is not the product — differentiation has to come from what's done with it (context → correlation → impact → detection → investigation → action).
6. Self-hosting alone and framework-agnosticism alone are not differentiators (see §5).
7. Alert **quality** matters more than alert **quantity** — noisy alerting destroys trust in the whole platform.
8. Customer impact should be first-class: "184 customers affected during payment for 17 minutes" beats "10,000 errors."
9. Release/deployment awareness is one of the strongest possible investigation questions ("did this deployment cause it?").
10. Different roles need different views of the same underlying data (§4).
11. Trust is a product requirement, not a nice-to-have: accuracy + signal + privacy + availability = engineer trust.
12. FrontWatch must monitor itself — a monitoring system that silently loses its own telemetry is dangerous.
13. Privacy must be architectural, not a settings-page toggle, given the regulated target market.
14. "Banking" is a strong starting hypothesis, not a proven exclusive vertical — fintech, insurance, healthcare, government, telecom, defense, and enterprise SaaS share the same underlying driver: telemetry that can't casually be delegated to a third-party SaaS.

## 7. Assumption register (confidence × impact × validation)

Legend: Confidence High/Medium/Low · Impact Critical/High/Medium/Low · 🔴 Critical risk 🟠 High risk. The dangerous zone is **low confidence + high impact** — these must be validated before committing significant engineering.

### Tier 1 — Business-critical (wrong here risks building an excellent product nobody buys)

| ID | Assumption | Confidence | Impact | Validate by |
|---|---|---|---|---|
| A6 | Existing tools don't fully satisfy the target environment | Medium | Critical | Interview banks/fintechs/insurers: why their current stack, what can't leave their environment |
| A7 | Self-hosting is valuable enough to influence purchase | Medium | Critical | Ask target orgs the *specific* reason telemetry can't go to third-party SaaS |
| A8 | Banking is the correct initial vertical | Medium | Critical | Compare pain × budget × regulatory pressure × competition across banking/fintech/insurance/healthcare/gov/enterprise SaaS |
| A13 | Organizations require full telemetry ownership | Medium | Critical | Ask: "where are you permitted to store production telemetry?" |
| A14 | Customers will trust FrontWatch with production telemetry | **Low** | Critical | Requires real security architecture, auditability, and eventually certifications (see §8) |

### Tier 2 — Product-critical (wrong here risks building the wrong product experience)

| ID | Assumption | Confidence | Impact |
|---|---|---|---|
| A2 | Reproduction consumes significant engineering time | High | Critical |
| A3 | Engineers need richer context than error logs provide | High | Critical |
| A5 | Alert noise can destroy the platform's value | High | Critical |
| A15 | Unified investigation (error→session→network→performance→release→deployment in one flow) reduces MTTR | Medium | Critical |
| A16 | Release correlation is highly valuable | High | High |
| A17 | Customer impact should be a first-class concept | Medium | High |

### Tier 3 — Technical-critical (wrong here risks not being able to build it safely)

| ID | Assumption | Confidence | Impact |
|---|---|---|---|
| A11 | SDK overhead can remain negligible | **Low** | Critical — needs a real benchmark: baseline app vs. app+SDK on LCP/INP/CLS/TTFB/JS execution/memory/network bytes |
| A12 | Enough telemetry can be collected without sensitive data | Medium | Critical — likely needs to be an SDK-architecture concern (redaction/allow-deny/field filtering/URL sanitization), not just a settings toggle |
| A18 | Proactive/automated intelligence can be built without becoming unreliable | **Low** | Critical — evidence + confidence + reasoning must stay inspectable; never assert root cause without visible support |
| A19 | FrontWatch itself can be reliable enough to be trusted production infrastructure | Medium | Critical |

Also tracked at lower risk: A1 (problems discovered too late — High confidence, foundational), A4 (engineers want proactive detection — High), A9 (customers accept SDK instrumentation — High/🟠), A10 (framework agnosticism is technically achievable without compromising quality — High/🟠).

**Discovery principle:** no major architecture or feature decision should exist without a documented problem, requirement, or validated assumption behind it.

## 8. Regulated-environment dimension

Banking/regulated telemetry can contain user identifiers, account identifiers, URLs, request info, session info, form interactions, headers, and application state. This creates a dual requirement: **need observability + need strict telemetry control** — data residency, ownership, access control, encryption, retention, auditability, network isolation, minimization, redaction. Certifications that may eventually matter (only after legal/security research confirms applicability, not assumed): SOC 2, ISO 27001, PCI DSS, GDPR, NDPR, local banking regulations.

## 9. Problem boundaries

**In scope:** reliability, runtime behavior, performance, network activity, user/session context, deployments/releases, customer impact, alerting, security-related frontend signals, telemetry governance.

**Explicitly out of scope initially:** full backend APM, full infrastructure monitoring, general product analytics, generic business intelligence, full SIEM.

## 10. What we know vs. don't know

**Reasonably well established:** frontend failures are hard to detect early; reproduction is genuinely hard; context matters; existing tools solve many individual sub-problems well; alert noise is real; deployment correlation is valuable; different roles need different views; privacy/control likely matters for regulated orgs.

**Still open:** exact willingness to pay; which org type feels the pain most; whether banking should be the exclusive vertical; whether self-hosting is a hard buying requirement; which deployment model is actually required (customer K8s? VPC? on-prem? air-gapped?); which telemetry customers consider unacceptable to collect; which MVP capabilities produce fastest value; whether session replay is essential or optional; tolerable SDK overhead; what customers consider a "frontend incident" at all.

These unknowns are what customer discovery (not more internal documentation) needs to resolve next.
