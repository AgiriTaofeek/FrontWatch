# Market Research

## 1. Research Objective

The purpose of this research is to understand the existing frontend observability market and determine:

- What existing products already solve.
- How they collect frontend telemetry.
- What observability capabilities are considered standard.
- How well existing solutions support self-hosting.
- How framework-agnostic current solutions are.
- Where privacy and data-control concerns arise.
- Where there may be an opportunity for a specialized platform for regulated environments.
- Whether FrontWatch should build its own telemetry model or leverage existing standards such as OpenTelemetry.

## 2. Market Definition

Frontend observability sits at the intersection of several existing categories:

```
                    FRONTEND OBSERVABILITY
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  Error Tracking          RUM             Performance
        │                  │                  │
        ▼                  ▼                  ▼
   Exceptions          Sessions           Web Vitals
   Stack traces         Users              Resources
   Releases             Devices          Interactions
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                     Investigation
                           │
                           ▼
                 Full-stack correlation
```

The major market participants are not all positioned identically.

Some focus primarily on:

- error tracking
- application performance monitoring
- real-user monitoring
- session replay
- product analytics
- full-stack observability

This distinction matters because FrontWatch should not simply copy one competitor's feature list.

## 3. Sentry

Sentry is one of the most directly relevant competitors.

Its ecosystem covers developer-oriented error tracking and performance monitoring, and Sentry also provides a self-hosted deployment option. The official self-hosted repository describes the self-hosted distribution as feature-complete for low-volume deployments and proof-of-concept use.

### Relevant Capabilities

Sentry's ecosystem demonstrates that developers expect capabilities such as:

- error tracking
- performance monitoring
- release tracking
- issue grouping
- stack traces
- frontend telemetry
- distributed tracing
- source-map support
- alerting
- debugging context

### Self-Hosting

This is particularly important for our product.

Sentry does already have self-hosting.

Therefore:

> "We are self-hosted" cannot by itself be our competitive differentiation.

That's one of our first major research findings.

Sentry's self-hosted architecture is also substantial. Its official repository includes components such as ClickHouse, Redis, Nginx, workers, and other infrastructure.

The current self-hosted project also shows that self-hosting a feature-rich observability platform introduces its own operational complexity; for example, recent releases include changes involving backend components and feature availability in self-hosted deployments.

### Strategic Implication

We need to ask:

> Can FrontWatch provide a significantly better self-hosted experience for regulated organizations than general-purpose observability platforms?

That is much more interesting than simply saying "Sentry but self-hosted."

## 4. Datadog RUM

Datadog's Real User Monitoring is another major reference point.

Datadog describes RUM as providing visibility into individual users' real-time application performance and user journeys. Its documented use cases include:

- frontend performance
- errors
- user journeys
- network requests
- frontend code
- usage analytics
- device/browser/country segmentation
- individual session investigation

This validates something important:

> The market already expects correlation.

Modern frontend observability isn't simply:

```
Error → stack trace
```

It's increasingly:

```
User
  ↓
Session
  ↓
Page
  ↓
Interaction
  ↓
Network request
  ↓
Error
  ↓
Backend
```

That aligns strongly with what we were independently discovering during our product discussion.

### Strategic Implication

FrontWatch needs to think in terms of connected events, not isolated telemetry.

## 5. New Relic Browser

New Relic Browser provides another mature implementation of frontend observability.

Its browser monitoring can collect:

- page views
- AJAX requests
- JavaScript errors
- session traces
- SPA route information
- performance information

and allows configuration around things such as data obfuscation, domains, URL grouping, alerts, and data collection.

However, its browser agent sends telemetry to New Relic's collectors, meaning the organization's browser clients need connectivity to New Relic's infrastructure.

This is directly relevant to our target environment.

### Strategic Implication

For highly controlled environments, the architecture needs to answer:

> Where exactly does telemetry go?

Not merely:

> "Is the dashboard secure?"

The telemetry pipeline itself becomes a product concern.

## 6. Grafana Faro

Grafana is especially interesting for us because it takes a more open observability-oriented approach.

Grafana's frontend observability offering uses the Faro Web SDK to collect frontend telemetry.

The documented signals include:

- real-user performance
- errors
- logs
- client-side traces
- user behavior
- page tracking
- SPA view tracking
- navigation
- custom events

It also supports filtering, sampling, privacy configuration, alerting, and correlation with backend observability.

### Why This Matters

Faro demonstrates an important architectural direction:

```
Frontend SDK
     ↓
 Telemetry
     ↓
Open observability ecosystem
     ↓
Logs / traces / metrics
```

Rather than creating a completely closed telemetry ecosystem.

### Potential Lesson for FrontWatch

We should seriously investigate whether FrontWatch should be:

> OpenTelemetry-compatible at the telemetry boundary while providing a specialized frontend observability experience on top.

However, we should not make that decision yet.

OpenTelemetry's browser instrumentation is currently described by its own documentation as experimental and mostly unspecified, which means relying on it blindly for the entire browser instrumentation layer could introduce problems.

That's an architecture question we'll investigate later.

## 7. Elastic RUM

Elastic provides Real User Monitoring through its JavaScript RUM agent.

One particularly relevant finding:

> Elastic explicitly describes its RUM JavaScript agent as framework-agnostic.

It can monitor frontend JavaScript applications regardless of framework and capture browser/user-experience metrics.

Elastic's RUM can also integrate with its broader APM ecosystem.

It supports concepts such as:

- browser interactions
- page performance
- Core Web Vitals
- URL segmentation
- OS
- browser
- location
- source maps
- backend correlation

Elastic also supports RUM through an APM Server that can be deployed as a standalone component, with configuration for origins, rate limits, source mapping, and other controls.

### Important Finding

Again:

> Framework agnosticism is not unique to FrontWatch.

We will need to compete on something deeper.

## 8. Highlight

Highlight is particularly interesting because it emphasizes cohesion between sessions, errors and logs.

Its session replay capabilities include:

- session replay
- console logs
- network requests
- errors
- user actions
- performance
- rage clicks
- Canvas/Iframe recording
- privacy/redaction
- session filtering
- session search

It also explicitly supports mapping frontend requests to backend errors/logs.

### Strategic Implication

Again we see the same market direction:

```
                    INCIDENT
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
      Error         Session          Network
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                  Investigation
```

This is becoming table stakes for sophisticated observability products.

## 9. PostHog

PostHog is slightly different because it is primarily a product-engineering/product-analytics platform rather than a pure observability platform.

Its ecosystem now spans areas such as:

- product analytics
- session replay
- error tracking
- logs
- feature flags
- experimentation
- data warehouse
- AI observability

### Strategic Implication

PostHog demonstrates another trend:

> The boundary between observability, analytics, and debugging is becoming increasingly blurred.

However, this also presents an opportunity.

For our target market, we don't necessarily need:

- Analytics
- Experiments
- Feature flags
- Surveys
- Product management

Our initial product can remain deeply focused on:

> Production frontend reliability, performance, security, and debugging.

## 10. Competitive Capability Matrix

Our first-pass matrix therefore looks like this:

| Capability | Sentry | Datadog | New Relic | Grafana/Faro | Elastic | Highlight |
|---|---|---|---|---|---|---|
| JS errors | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Performance | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| RUM | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Network monitoring | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sessions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Session replay | ✓ | ✓ | ✓ | ecosystem | ecosystem | ✓ |
| Release tracking | ✓ | ✓ | ✓ | possible | ✓ | ✓ |
| Backend correlation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Framework agnostic | strong | strong | strong | strong | explicit | strong |
| Self-hosting | ✓ | primarily SaaS | primarily SaaS | ecosystem | ✓ | needs investigation |
| Privacy controls | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Security-focused positioning | partial | broad | broad | broad | broad | partial |
| Banking-specific focus | — | — | — | — | — | — |

> **Important:** this is a first-pass capability map, not yet our final competitive analysis. We will validate each capability and hosting model more deeply in `competitive-analysis.md`.

## 11. The Most Important Finding

After looking at the market, I would not position FrontWatch as:

> "A self-hosted Sentry."

That is too weak.

Sentry already has self-hosting.

I also wouldn't position it simply as:

> "A framework-agnostic frontend monitoring platform."

Elastic already explicitly provides framework-agnostic RUM.

Nor:

> "A platform that monitors frontend errors, performance and sessions."

The market already does that extremely well.

## 12. Where the Opportunity Starts Becoming Interesting

Our research is suggesting that the opportunity may be the combination of several things:

```
                              FRONTWATCH
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
         FRONTEND            SECURITY            CONTROL
      OBSERVABILITY        & PRIVACY           & OWNERSHIP
             │                  │                  │
             ▼                  ▼                  ▼
          Errors             Sensitive          Self-hosted
        Performance          telemetry            Private
          Network             controls        Data sovereignty
         Releases            Redaction        Controlled infra
          Sessions           Governance       No external SaaS
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                       REGULATED INDUSTRIES
```

And then another layer:

```
                   FRONTWATCH
                     │
                     ▼
             "Why is my frontend
                unhealthy?"
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        Detect     Explain     Verify
          │          │          │
          ▼          ▼          ▼
       Problem    Root cause   Recovery
```

This is much closer to a compelling product thesis.

## 13. A Very Important Architectural Finding

The market also validates something we were already thinking about:

> The frontend is not just JavaScript.

For our product to truly support:

- Next.js
- Nuxt
- SvelteKit
- TanStack Start
- React Router
- Remix
- SolidStart
- React
- Vue
- Svelte
- Solid

and:

- SPA
- SSR
- SSG
- Hybrid

we need to separate:

> Framework-specific instrumentation

from:

> Framework-independent browser observability

Conceptually:

```
                      FRONTWATCH SDK
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Framework Adapters       Browser Core
              │                     │
              ▼                     ▼
       Next.js adapter            Errors
       Nuxt adapter               Network
       SvelteKit adapter          Performance
       TanStack adapter           Navigation
       Remix adapter              Interactions
       etc.                       Security
              │                     │
              └──────────┬──────────┘
                         ▼
                  Common Telemetry
                         │
                         ▼
                  FrontWatch Collector
```

We aren't choosing this architecture yet.

But this separation should become a hypothesis we investigate during architecture discovery.

## 14. What We Should NOT Build Yet

This research gives us permission to say no to several things for MVP consideration.

We should not automatically build:

- product analytics
- feature flags
- A/B testing
- surveys
- generic log management
- generic infrastructure monitoring
- generic backend APM
- synthetic monitoring
- a general-purpose SIEM

Those are existing categories with enormous scope.

Our focus should remain:

> The production frontend.

## 15. Current Research Hypotheses

These are hypotheses, not final decisions:

### Hypothesis 1

Self-hosting alone is insufficient differentiation.

Validated by the existence of Sentry self-hosting and self-managed observability ecosystems.

### Hypothesis 2

Framework agnosticism is table stakes rather than differentiation.

Elastic explicitly provides framework-agnostic RUM, among others.

### Hypothesis 3

Correlation is essential.

Modern products increasingly connect errors, sessions, network requests, performance, releases and backend context.

### Hypothesis 4

Privacy needs to be an architectural property, not merely a settings page.

Browser monitoring inherently involves sending telemetry from customers' browsers to an ingestion system, and existing products provide various controls around what is collected and where it goes.

### Hypothesis 5

Regulated-industry requirements may provide a stronger niche than generic frontend monitoring.

This is the hypothesis we need to investigate next rather than assuming it is true.

## 16. Research Questions Still Open

Our research is not finished.

Before we move to the next document, we need to investigate:

1. What exactly makes banking frontend telemetry sensitive?
2. What compliance/data-residency requirements matter?
3. What does "self-hosted" need to mean for a bank?
   - on-prem?
   - private cloud?
   - air-gapped?
   - customer's Kubernetes?
   - customer's VPC?
4. What data should NEVER leave the customer's environment?
5. What telemetry do existing products collect that banks may not want collected?
6. How do existing products handle PII?
7. What are the real operational costs of self-hosting Sentry/Grafana/Elastic?
8. What would make a bank choose FrontWatch instead?
9. What does a truly framework-independent SDK require?
10. What is the smallest product that delivers our core value proposition?

Those questions will feed directly into the other documents in our existing structure.
