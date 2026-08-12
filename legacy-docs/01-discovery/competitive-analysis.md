# Competitive Analysis

> Status: Draft
> Section: 01-discovery

## 1. Purpose

This document evaluates the major products that overlap with FrontWatch's intended problem space.

The objective is not to prove that competitors are bad.

The objective is to understand:

- What the market already considers table stakes.
- Where competitors are technically strong.
- How they collect frontend telemetry.
- How they handle correlation.
- How they approach self-hosting.
- How they approach privacy.
- How framework-agnostic they are.
- Where their architecture creates constraints.
- Where FrontWatch could potentially differentiate.

## 2. Competitive Landscape

Our primary competitors/references are:

- Sentry
- Datadog RUM
- New Relic Browser
- Grafana Faro
- Elastic RUM
- Highlight
- PostHog

There are also adjacent technologies we need to consider:

- OpenTelemetry
- Prometheus
- Grafana
- ELK / Elastic
- Browser Performance APIs
- Cloud provider monitoring
- Synthetic monitoring

The competitors aren't identical.

A useful way to visualize them:

```
                         BROAD OBSERVABILITY
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
           Datadog           New Relic          Elastic
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                        Full-stack APM
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
            Sentry          Grafana Faro       Highlight
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                       Frontend / RUM
                                │
                             FrontWatch?
                                │
                                ▼
                  Regulated Frontend Observability
```

This is only a positioning hypothesis at this stage.

## 3. Sentry

### Positioning

Sentry is probably the closest conceptual competitor to FrontWatch.

It is heavily developer-oriented and provides:

- error tracking
- performance monitoring
- issue grouping
- stack traces
- releases
- source maps
- frontend monitoring
- tracing
- session replay
- alerts

### Self-Hosting

This is a critical discovery.

Sentry already provides a self-hosted distribution. Its official self-hosted repository describes it as a feature-complete package for low-volume deployments and proof-of-concepts.

Therefore:

> Self-hosting is not enough to differentiate FrontWatch.

More importantly, the current self-hosted architecture is substantial.

The official Docker Compose configuration includes components such as:

- Sentry
- PostgreSQL
- Redis
- Kafka
- ClickHouse
- Snuba
- Symbolicator
- Memcached
- Nginx
- Relay
- SeaweedFS
- Taskbroker

among others.

### What This Tells Us

Self-hosting a mature observability platform can become an infrastructure project in itself.

That creates a potential opportunity:

> Could FrontWatch deliver the benefits of self-hosted frontend observability with dramatically lower operational complexity?

This is now a serious hypothesis.

## 4. Datadog RUM

Datadog RUM is a mature reference implementation for Real User Monitoring.

It focuses heavily on:

```
User
  ↓
Session
  ↓
Page
  ↓
Interaction
  ↓
Network
  ↓
Error
  ↓
Backend
```

Datadog's browser RUM documentation describes monitoring real-time performance and individual user journeys and supports configurable browser SDK instrumentation and data/context collection.

### Strengths

- Mature RUM
- User journey visibility
- Performance
- Errors
- Network
- Device/browser segmentation
- Backend correlation
- Broad observability ecosystem

### Weakness

For our particular problem, Datadog is positioned as a large general observability platform rather than a focused private frontend-observability system.

This creates potential differentiation around:

- Simplicity
- Frontend specialization
- Self-hosting
- Privacy
- Regulated environments

But we cannot yet claim that this is enough.

## 5. New Relic Browser

New Relic's Browser Monitoring is another mature RUM solution.

It covers:

- page views
- Web Vitals
- session replay
- AJAX requests
- JavaScript errors
- error profiles
- session traces
- geography
- browser/device segmentation
- distributed tracing
- page resources

New Relic explicitly supports SPA monitoring as well.

### Important Architectural Observation

New Relic's browser agent collects telemetry and sends it to New Relic collectors. Its documentation identifies collector domains such as `bam.nr-data.net` and `bam-cell.nr-data.net`.

This is a significant distinction for our target environment.

Our target organization may want:

```
Customer Browser
       ↓
Organization-controlled endpoint
       ↓
Organization-controlled infrastructure
       ↓
Organization-controlled storage
```

rather than:

```
Customer Browser
       ↓
Third-party SaaS collector
       ↓
Third-party infrastructure
```

### Competitive Insight

The question isn't simply:

> "Does the competitor encrypt telemetry?"

It becomes:

> "Who ultimately controls the telemetry infrastructure?"

That distinction may become central to FrontWatch.

## 6. Grafana Faro

Grafana Faro is perhaps the most architecturally interesting open-source reference for us.

The Faro Web SDK is an open-source browser SDK that can collect:

- performance
- errors
- logs
- events
- traces

and forward telemetry to Grafana or an OpenTelemetry-compatible backend.

Grafana explicitly describes support for SPAs, MPAs, and modern frontend frameworks.

It also has framework-specific integrations, including React Router and Next.js, and its React integration includes SSR support.

### Why Faro Matters

Faro suggests a powerful architecture:

```
                 Browser
                    │
                    ▼
              Faro Web SDK
                    │
                    ▼
              Telemetry
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    Grafana backend      OTel backend
```

The SDK is separated from the storage/visualization system.

That is very close to what we may eventually want.

### But There's an Important Difference

Grafana's managed Frontend Observability is strongly integrated with Grafana Cloud. Its documentation describes the default transport sending telemetry to a configured remote collector endpoint.

So the interesting question for us isn't:

> "Can we build something like Faro?"

It is:

> "Can we build a purpose-designed frontend telemetry system where the entire collection → processing → storage → analysis pipeline is designed for private deployment?"

## 7. Elastic RUM

Elastic's RUM implementation is another extremely important competitor.

The Elastic RUM JavaScript Agent is explicitly framework-agnostic.

It captures things including:

- page-load metrics
- static asset loading
- API requests
- SPA navigation
- user interactions
- long tasks
- FCP
- LCP
- INP
- JavaScript errors
- distributed tracing
- network information

### Competitive Implication

This kills another simplistic differentiation idea:

> "FrontWatch works with every frontend framework."

That's valuable, but not unique enough.

Elastic already demonstrates that framework-independent browser instrumentation is possible.

## 8. Highlight

Highlight is particularly relevant because of its emphasis on debugging from the user's perspective.

Its platform combines:

- session replay
- JavaScript monitoring
- console logs
- errors
- network requests
- privacy controls
- backend correlation

This is very close to our desired investigation workflow.

For example:

```
Customer
   ↓
Button click
   ↓
Frontend interaction
   ↓
API request
   ↓
API failure
   ↓
Frontend error
   ↓
Backend error
```

Highlight attempts to make that entire chain visible.

### Important Finding

Again:

> Contextual debugging is already becoming table stakes.

FrontWatch can't simply say:

> "We show the developer what the user experienced."

Competitors already do that.

## 9. PostHog

PostHog is an adjacent competitor rather than a pure observability competitor.

Its current platform spans:

- product analytics
- session replay
- error tracking
- logs
- feature flags
- experiments
- data warehouse
- AI observability

Its error tracking connects errors to:

- stack traces
- affected users
- session context
- session replay

### Strategic Implication

PostHog demonstrates that users increasingly expect multiple forms of application telemetry to exist in one environment.

However, this also gives us a reason not to compete head-on with the entire product analytics market.

Our initial focus can remain much narrower:

> Production frontend reliability and observability.

## 10. Competitive Capability Matrix

Here's our more rigorous first-pass comparison.

| Capability | Sentry | Datadog | New Relic | Grafana Faro | Elastic | Highlight | FrontWatch |
|---|---|---|---|---|---|---|---|
| JS errors | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Runtime errors | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Performance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Web Vitals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Network requests | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Sessions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Session replay | ✅ | ✅ | ✅ | — | — | ✅ | TBD |
| User segmentation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Releases | ✅ | ✅ | ✅ | — | — | — | Planned |
| Source maps | ✅ | ✅ | ✅ | partial/ecosystem | ✅ | — | Planned |
| Distributed tracing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Backend correlation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Planned |
| Framework agnostic | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Core goal |
| Self-hosting | ✅ | Limited/enterprise options | Limited | ecosystem-dependent | ✅ | Open-source/self-hosting options | Core goal |
| Private telemetry infrastructure | possible | depends on deployment | depends on deployment | possible through ecosystem | possible | possible | Core goal |
| Banking-specific | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Potential |
| Frontend-first | Strong | No | No | Strong | Moderate | Strong | Core goal |
| Privacy-by-architecture | Partial | Partial | Partial | Configurable | Configurable | Strong controls | Potential differentiator |

> The table should not be treated as final product requirements. Several competitor capabilities and deployment models need deeper verification before we freeze the matrix.

## 11. What We Absolutely Cannot Use as Differentiators

The research has now eliminated several tempting ideas.

**❌ Self-hosted**
Sentry already has self-hosting.

**❌ Framework agnostic**
Elastic's RUM agent is explicitly framework-agnostic.

**❌ Error monitoring**
Essentially every serious competitor does this.

**❌ Performance monitoring**
Table stakes.

**❌ Session replay**
Already widely available.

**❌ Network monitoring**
Already available.

**❌ Backend correlation**
Already available.

**❌ Web Vitals**
Already available.

So if our product pitch is:

> "Self-hosted frontend monitoring that tracks errors, performance and sessions across frameworks"

we probably don't have a sufficiently differentiated product.

## 12. Where FrontWatch May Actually Have an Opportunity

The research is starting to point toward a stronger combination.

```
                       GENERAL OBSERVABILITY
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
               Datadog                    New Relic
                  │                           │
                  └─────────────┬─────────────┘
                                ▼
                          Broad platforms
                                │
        ─────────────────────────────────────────────
                                │
                          FRONTEND RUM
                                │
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
               Sentry       Elastic      Highlight
                  │            │            │
                  └────────────┼────────────┘
                                ▼
                        Developer-focused
                                │
        ─────────────────────────────────────────────
                                │
                             FRONTWATCH
                                │
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
              Frontend      Privacy      Private
                first         first     deployment
                  │            │            │
                  └────────────┼────────────┘
                                ▼
                         REGULATED SYSTEMS
```

But I want to be careful here.

We have not yet proven that "banking-specific" is the right market.

That's one of the things `user-research.md` and further discovery must validate.

## 13. The Bigger Potential Differentiator

There is something more interesting than "self-hosted."

Remember our original problem:

```
Customer reports
       ↓
Developer reproduces
       ↓
Developer investigates
```

Our desired experience was:

```
Problem happens
       ↓
FrontWatch detects it
       ↓
FrontWatch understands impact
       ↓
FrontWatch correlates context
       ↓
FrontWatch tells engineer
       ↓
Engineer fixes it
```

This suggests that the real differentiation may eventually be:

> Proactive frontend intelligence

rather than:

> Frontend telemetry collection

Those are very different products.

**Telemetry collection**

```
Error occurred
       ↓
Store error
       ↓
Show error
```

**Intelligence**

```
Error occurred
       ↓
Correlate with:
  ├── user
  ├── session
  ├── route
  ├── API
  ├── browser
  ├── device
  ├── release
  ├── deployment
  ├── performance
  └── previous behavior
       ↓
Determine:
  ├── severity
  ├── affected population
  ├── likely cause
  ├── regression
  └── trend
       ↓
Notify engineer
       ↓
Provide investigation context
```

That is considerably more interesting.

## 14. Another Important Market Signal

The market is already moving toward automated interpretation of telemetry.

For example, PostHog's current ecosystem includes AI-oriented functionality and its community describes "self-driving" workflows that can act on signals such as errors and session data.

We shouldn't immediately add AI to FrontWatch.

Instead, this tells us something strategically important:

> Raw telemetry is becoming less valuable than actionable conclusions derived from telemetry.

That should influence our long-term roadmap.

## 15. Competitive Gap Hypotheses

At this point I would document the following as hypotheses:

### Gap A — Regulated Frontend Observability

Existing platforms are generally horizontal.

**Hypothesis:** A platform designed around regulated organizations could provide stronger defaults for:

- data minimization
- telemetry ownership
- PII controls
- deployment isolation
- auditability
- retention policies
- data residency
- private networking
- access controls

This needs validation.

### Gap B — Operationally Simple Self-Hosting

Sentry demonstrates that self-hosting a mature observability platform can require a significant infrastructure footprint. Its current self-hosted Compose configuration includes databases, queues, caches, ClickHouse, processing services and other components.

**Hypothesis:** FrontWatch could differentiate through:

> Enterprise-grade frontend observability without requiring an enterprise-grade observability infrastructure team to operate it.

That's a compelling engineering challenge.

### Gap C — Frontend-First Rather Than Full-Stack-First

Datadog, New Relic, Elastic and Grafana are much broader platforms.

FrontWatch could make the frontend the primary domain:

```
Browser
   ↓
Frontend runtime
   ↓
Frontend framework
   ↓
Network
   ↓
User experience
   ↓
Deployment
```

Then integrate with backend systems rather than attempting to replace them.

### Gap D — Deployment-Aware Frontend Intelligence

Our product could treat:

- Release
- Deployment
- Frontend health
- User impact

as first-class connected concepts.

For example:

```
Deployment #482
       ↓
Error rate: +340%
       ↓
Started 2 minutes after deployment
       ↓
Affected route: /payments
       ↓
Affected browsers: Chrome Android
       ↓
Affected users: 1,284
       ↓
Likely regression
```

This is much closer to the problem we originally described.

## 16. Competitive Positioning Hypothesis

Not final.

But based on the research so far, our strongest working hypothesis is:

> FrontWatch is a self-hosted, frontend-first observability platform designed for organizations that need complete control over production frontend telemetry, with proactive detection and investigation of reliability, performance, and security problems.

The important words are:

- self-hosted
- frontend-first
- privacy/control
- proactive detection
- investigation

Not merely "monitoring."

## 17. Strategic Decision We Should NOT Make Yet

I deliberately don't want us to decide:

> "FrontWatch is exclusively for banks."

Yet.

You originally identified banking web applications as the environment driving the problem. That's excellent.

But there may be a broader market:

- Banks
- Insurance
- Fintech
- Healthcare
- Government
- Defense
- Telecom
- Enterprise SaaS

where the same requirements exist.

So we'll investigate this rather than locking ourselves into a market prematurely.

## 18. Updated Discovery Knowledge

At this point, we know:

```
                    FRONTWATCH DISCOVERY

Problem
   ↓
Production frontend is difficult to observe completely
   ↓
Current workflow is reactive
   ↓
Customer reports problems first
   ↓
Need proactive detection
   ↓
Need rich investigation context
   ↓
Existing products already solve much of telemetry collection
   ↓
Therefore telemetry alone isn't differentiation
   ↓
Self-hosting alone isn't differentiation
   ↓
Framework agnosticism alone isn't differentiation
   ↓
Potential opportunity:
Frontend-first + private + regulated + proactive intelligence
```
