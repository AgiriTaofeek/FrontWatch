# Assumptions

## 1. Purpose

The purpose of this document is to identify assumptions underlying FrontWatch's:

- problem
- users
- market
- product
- technology
- business model
- security model
- adoption model

Each assumption will be classified by:

| Attribute | Meaning |
|---|---|
| Confidence | How strongly we currently believe it |
| Impact | How damaging it would be if wrong |
| Risk | Overall priority for validation |
| Validation | How we can prove/disprove it |

## 2. Assumption Framework

We'll use:

- **Confidence:** High · Medium · Low
- **Impact:** Critical · High · Medium · Low

The most dangerous assumptions are:

> Low confidence + High impact

Those must be validated before we commit significant engineering resources.

## 3. Problem Assumptions

### A1 — Production Frontend Problems Are Discovered Too Late

**Statement:** Customers frequently discover frontend problems before engineering teams do.

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🔴 Critical |

This comes directly from your current organizational experience and is the foundational problem we're solving.

Our target workflow is:

**Current**

```
Customer
   ↓
Problem
   ↓
Customer reports
   ↓
Engineer investigates
```

**Desired**

```
Problem
   ↓
FrontWatch detects
   ↓
Engineer investigates
   ↓
Customer may never notice
```

This is also consistent with the broader frontend observability problem: frontend failures can occur entirely in the browser and never appear in backend logs.

**Validation** — Measure:

- percentage of production frontend incidents discovered by customers
- percentage discovered internally
- time between incident occurrence and discovery

### A2 — Reproduction Consumes Significant Engineering Time

**Statement:** Engineers lose meaningful time trying to reproduce frontend production issues.

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🔴 Critical |

This is central to our product value.

Why? The production environment contains dimensions unavailable on the developer's machine:

- Browser
- Device
- OS
- Network
- Location
- User state
- Application state
- Release
- Feature flags
- Timing
- Backend response
- Interaction sequence

Therefore:

```
Production event
        ≠
Developer reproduction
```

**Validation** — Instrument your current incident process. For each frontend incident record:

- Time reported
- Time investigation started
- Time reproduced
- Time root cause identified
- Time fixed

The key metric becomes: **Time-to-reproduce.**

### A3 — Engineers Need Richer Context Than Error Logs Provide

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🔴 Critical |

A useful investigation may require:

```
Error + Stack trace + URL + Route + Release + Browser + Device
     + Network + User/session context + Requests + Performance + Timeline
```

This is consistent with the market direction toward connected frontend telemetry rather than isolated error records.

**Validation** — Take 10 real production incidents. For each: what information did the engineer actually need to resolve it? That becomes one of our most valuable research exercises.

### A4 — Engineers Want Proactive Detection

**Statement:** Engineers would prefer discovering important production issues before customers report them.

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🔴 Critical |

This sounds obvious, but we need to distinguish:

> "Detect every error" from "Detect meaningful customer-impacting problems"

The second is what matters.

Current observability research emphasizes that organizations increasingly need to prioritize business-critical signals rather than simply increasing telemetry volume.

### A5 — Alert Noise Can Destroy the Value of the Platform

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🔴 Critical |

This is one of our most important assumptions.

If FrontWatch produces 10,000 alerts but only 3 actually matter, the platform becomes background noise.

Grafana's 2026 observability survey identifies complexity as the leading observability concern and alert fatigue as a major obstacle to faster incident response.

This is especially relevant to banking systems, where large volumes of telemetry can create alert floods that slow diagnosis.

**Product implication:** Our success metric should not be "number of problems detected." It should eventually include "percentage of alerts judged actionable."

## 4. Market Assumptions

### A6 — Existing Tools Don't Fully Satisfy the Target Environment

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

We know existing products are technically sophisticated. Therefore we cannot claim "nobody solves this." They clearly do.

Our hypothesis is narrower:

> Existing platforms may not optimally combine frontend-first observability, private deployment, telemetry ownership, strong privacy controls, and the operational requirements of regulated organizations.

This remains unproven.

**Validation** — Interview banks, fintechs, insurance companies, and regulated enterprises, and ask:

- Why did you choose your current observability stack?
- What prevents you from using a SaaS observability provider?
- What data cannot leave your environment?
- What would you change about your current solution?

### A7 — Self-Hosting Is Valuable Enough to Influence Purchase Decisions

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

We know self-hosting is technically possible with major products such as Sentry.

Therefore: "self-hosted" isn't automatically "customer wants it."

We need to understand the actual driver:

- Data residency?
- Security?
- Regulation?
- Network isolation?
- Vendor risk?
- Cost?
- Organizational policy?
- Customer trust?

**Validation** — Ask target organizations: "What is the specific reason telemetry cannot be sent to a third-party SaaS?" The answer matters enormously.

### A8 — Banking Is the Correct Initial Vertical

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

Your original environment is banking/customer-facing financial applications. That makes banking a very strong starting hypothesis.

Current industry research supports the importance of observability in financial services, particularly around security, regulatory compliance, operational resilience, and controlling sensitive telemetry.

But this does not prove that banking is our best commercial market.

Potential adjacent markets:

- Banking
- Fintech
- Insurance
- Healthcare
- Government
- Telecom
- Defense
- Enterprise SaaS

**Validation** — Compare pain intensity + budget + regulatory pressure + buying process + competition + deployment requirements across verticals.

### A9 — Customers Will Accept Installing Frontend Instrumentation

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🟠 High |

Every frontend observability platform depends on instrumentation. The basic model is:

```
Customer application
        ↓
    FrontWatch SDK
        ↓
    Telemetry
        ↓
 FrontWatch collector
```

But organizations may have concerns about:

- bundle size
- runtime overhead
- privacy
- security
- network traffic
- CSP
- application stability
- deployment complexity

**Validation** — Eventually we need to benchmark: SDK size, initialization cost, CPU overhead, memory overhead, network overhead, page performance impact.

### A10 — Framework Agnosticism Is Technically Achievable Without Compromising Quality

| Confidence | Impact | Risk |
|---|---|---|
| High | High | 🟠 High |

Our target:

- React, Next.js, Remix, React Router, TanStack Start
- Vue, Nuxt
- Svelte, SvelteKit
- Solid, SolidStart

plus SPA, SSR, SSG, Hybrid — is ambitious.

The browser layer can be framework-independent, but framework-specific behavior such as routing, SSR, hydration, server/client boundaries, error boundaries, streaming, and navigation may require adapters.

**Working hypothesis:**

```
                 FrontWatch SDK
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    Browser Core          Framework Adapters
          │                     │
          │            ┌────────┼────────┐
          │            ▼        ▼        ▼
          │          Next     Vue     Svelte...
          │
          ▼
     Common telemetry
```

This is an architecture hypothesis — not a final decision.

### A11 — The Telemetry Overhead Will Be Acceptable

| Confidence | Impact | Risk |
|---|---|---|
| Low | Critical | 🔴 Critical |

This is one of our most dangerous technical assumptions.

A monitoring platform must not make the monitored application slower.

```
Application performance
        ↓
Minimal monitoring overhead
```

Potential constraints: SDK bundle size, CPU, memory, event volume, serialization, network requests, storage, session replay overhead.

**Validation** — This needs an actual benchmark. We should eventually establish:

```
Baseline application  vs  Application + FrontWatch
```

and measure: LCP, INP, CLS, TTFB, JS execution, memory, network bytes, long tasks.

### A12 — We Can Collect Enough Telemetry Without Collecting Sensitive Data

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

This is extremely important for banking.

We want enough context without sensitive customer information.

Potentially dangerous telemetry includes:

- Form values
- Tokens
- Authorization headers
- Account numbers
- Personal information
- URLs containing sensitive identifiers
- Request/response bodies
- Session data

Therefore the product may need: automatic redaction + allow/deny rules + field-level filtering + URL sanitization + request header controls + payload controls + PII detection.

This isn't simply a "security feature." It may need to be part of the SDK architecture.

### A13 — Organizations Want Telemetry Ownership

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

Our hypothesis: a regulated organization may prefer telemetry to remain entirely within infrastructure it controls.

Possible deployment models:

- Customer Kubernetes
- Customer VPC
- Private cloud
- On-premises
- Air-gapped environment

But we have not yet determined which are actually required.

**Validation** — Ask target customers: "Where are you permitted to store production telemetry?" This should become a hard product requirement only after validation.

### A14 — Customers Will Trust FrontWatch With Production Telemetry

| Confidence | Impact | Risk |
|---|---|---|
| Low | Critical | 🔴 Critical |

This is one of the biggest commercial assumptions.

A bank could say "we don't trust third-party observability vendors." But that doesn't automatically mean "we trust FrontWatch."

We would need: security architecture, auditability, access control, encryption, deployment isolation, data retention, data deletion, audit logs, secrets management, vulnerability management.

Eventually, potentially: SOC 2, ISO 27001, PCI DSS, NDPR, GDPR, local banking regulations.

But we must not turn those into product requirements yet until legal/security research identifies which actually apply to our target market.

## 5. Product Assumptions

### A15 — A Unified Frontend Investigation Experience Reduces MTTR

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

**Hypothesis:**

```
Error → Session → Network → Performance → Release → Deployment
```

in one investigation flow will reduce context switching + investigation time.

This is highly plausible, and current practitioner discussion repeatedly highlights fragmented observability tools as a source of cognitive and operational overhead.

But we should prove it.

### A16 — Release Correlation Is Highly Valuable

| Confidence | Impact | Risk |
|---|---|---|
| High | Critical | 🟠 High |

One of our strongest hypotheses:

```
Deployment → Frontend health changes → Error spike → Affected users
```

The engineer wants to know: "Did this deployment cause the incident?"

This can potentially be one of FrontWatch's strongest workflows.

### A17 — Customer Impact Should Be a First-Class Concept

| Confidence | Impact | Risk |
|---|---|---|
| Medium | High | 🟠 High |

Instead of "523 JavaScript errors," we want "523 errors affecting 184 customers during checkout."

This distinction is increasingly important in observability: industry guidance is shifting toward connecting observability to business-critical functions and outcomes rather than treating telemetry as an end in itself.

However, we need to determine exactly how much business context customers are willing to provide.

### A18 — Proactive Intelligence Can Be Built Without Becoming Unreliable

| Confidence | Impact | Risk |
|---|---|---|
| Low | Critical | 🔴 Critical |

Eventually we want FrontWatch to say:

```
⚠️ Checkout degradation detected

Error rate increased 287%
starting 4 minutes after deployment 821.

Affected:
- 3,218 sessions
- Chrome Android
- /checkout

Likely regression: HIGH
```

But automated conclusions can be wrong.

Therefore: we must never confuse "intelligent" with "confidently guessing."

Our future intelligence system must expose evidence + confidence + reasoning/context rather than simply asserting "this is the root cause."

### A19 — The Monitoring Platform Itself Can Be Reliable Enough

| Confidence | Impact | Risk |
|---|---|---|
| Medium | Critical | 🔴 Critical |

This is a fundamental meta-assumption.

FrontWatch monitors customer applications. Therefore FrontWatch itself becomes critical infrastructure.

We need to monitor: SDK, collector, ingestion, queue, processing, storage, query, alerting, dashboard.

The eventual architecture must include:

```
              FRONTWATCH
                │
       ┌────────┴────────┐
       ▼                 ▼
 Customer telemetry   FrontWatch telemetry
       │                 │
       └────────┬────────┘
                ▼
        Platform health
```

If the collector is down, we need to know.

## 6. Technical Assumption Matrix

| ID | Assumption | Confidence | Impact | Risk |
|---|---|---|---|---|
| A1 | Production problems are discovered too late | High | Critical | 🔴 |
| A2 | Reproduction wastes significant time | High | Critical | 🔴 |
| A3 | Engineers need rich production context | High | Critical | 🔴 |
| A4 | Engineers want proactive detection | High | Critical | 🔴 |
| A5 | Alert noise destroys trust | High | Critical | 🔴 |
| A6 | Existing tools don't fully satisfy target | Medium | Critical | 🔴 |
| A7 | Self-hosting affects purchasing | Medium | Critical | 🔴 |
| A8 | Banking is correct initial vertical | Medium | Critical | 🔴 |
| A9 | Customers accept SDK instrumentation | High | Critical | 🟠 |
| A10 | Framework agnosticism is achievable | High | High | 🟠 |
| A11 | SDK overhead can remain negligible | Low | Critical | 🔴 |
| A12 | Telemetry can be useful without sensitive data | Medium | Critical | 🔴 |
| A13 | Customers require telemetry ownership | Medium | Critical | 🔴 |
| A14 | Customers will trust FrontWatch | Low | Critical | 🔴 |
| A15 | Unified investigation reduces MTTR | Medium | Critical | 🔴 |
| A16 | Release correlation is valuable | High | Critical | 🟠 |
| A17 | Customer impact should be first-class | Medium | High | 🟠 |
| A18 | Proactive intelligence can be reliable | Low | Critical | 🔴 |
| A19 | FrontWatch itself can be highly reliable | Medium | Critical | 🔴 |

## 7. Highest-Priority Validation

We have enough assumptions now that we can rank what must be proven first.

### Tier 1 — Business-Critical

- A6 — Existing tools don't fully satisfy target
- A7 — Self-hosting actually matters
- A8 — Banking is the right initial market
- A13 — Telemetry ownership matters
- A14 — Customers will trust FrontWatch

If these are wrong, we could build a technically excellent product nobody wants.

### Tier 2 — Product-Critical

- A2 — Reproduction is sufficiently painful
- A3 — Rich context materially improves investigation
- A5 — Alert noise is a major problem
- A15 — Unified investigation reduces MTTR
- A16 — Release correlation is valuable
- A17 — Customer impact is valuable

If these are wrong, we may build the wrong product experience.

### Tier 3 — Technical-Critical

- A11 — SDK overhead
- A12 — Sensitive-data handling
- A18 — Automated intelligence reliability
- A19 — FrontWatch reliability

If these are wrong, we may not be able to build the product safely.

## 8. The Most Important Insight

We now have a very useful distinction:

```
              ASSUMPTION
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
     Problem             Solution
        │                   │
        ▼                   ▼
"People have this     "Our proposed
     pain."            solution fixes it."
```

We currently have stronger evidence for the problem than for the solution.

That's exactly where we should be at this stage.

We should not prematurely decide: exact SDK architecture, database, event schema, microservices, Kafka, ClickHouse, Kubernetes, React dashboard architecture, AI architecture, session replay implementation.

Those come later.

## 9. Discovery Principle

I recommend we establish this rule for the rest of the project:

> No major architecture or feature decision should exist without a documented problem, requirement, or validated assumption behind it.

That will keep us from building a technically impressive system that solves the wrong problem.
