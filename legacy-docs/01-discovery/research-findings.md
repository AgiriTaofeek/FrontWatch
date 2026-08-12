# Research Findings

## 1. Executive Summary

We began with a simple observation:

> Our organization needs to know what is happening inside a deployed frontend application before customers discover and report problems.

The investigation has revealed that this is broader than frontend error tracking.

A production frontend can fail through:

- JavaScript/runtime errors
- failed API requests
- broken navigation
- hydration failures
- rendering problems
- deployment regressions
- performance degradation
- browser/device-specific failures
- network problems
- security violations
- failures affecting only a subset of customers

The current operational model is largely reactive:

```
Customer experiences problem
        ↓
Customer reports problem
        ↓
Engineer investigates
        ↓
Engineer tries to reproduce
        ↓
Engineer searches logs/tools
        ↓
Engineer identifies cause
        ↓
Engineer fixes
```

The desired model is:

```
Frontend problem occurs
        ↓
FrontWatch detects it
        ↓
FrontWatch determines significance
        ↓
FrontWatch determines customer impact
        ↓
FrontWatch correlates relevant context
        ↓
Engineer/DevOps is notified
        ↓
Engineer investigates
        ↓
Fix is deployed
        ↓
FrontWatch verifies recovery
```

This is the fundamental product opportunity.

## 2. Finding: The Problem Is Real

The strongest evidence we currently possess is from the actual environment that motivated FrontWatch.

The organization is building customer-facing web applications and needs to ensure:

- the platform is functional
- bugs are detected earlier
- issues are fixed before customers report them
- application performance is continuously understood
- production incidents can be investigated efficiently

This gives us a real problem context, rather than starting with technology and looking for a problem afterward.

That distinction is important because product-discovery guidance recommends making problem hypotheses explicit and validating them before committing to solutions.

> **Finding:** Production frontend reliability currently requires too much reactive human investigation.
>
> **Confidence:** High

## 3. Finding: "Frontend Health" Is Much Larger Than Errors

Our initial thinking could easily have become:

```
Frontend monitoring = JavaScript errors
```

Research has disproved that as an adequate model.

The actual health model is closer to:

```
                    FRONTEND HEALTH
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
   Reliability        Performance         Security
       │                  │                  │
       ├─ Errors          ├─ Web Vitals      ├─ CSP
       ├─ Crashes         ├─ Navigation      ├─ Unsafe behavior
       ├─ API failures    ├─ Resources       ├─ Sensitive data
       ├─ Blank screens   ├─ Interactions    └─ Violations
       └─ Hydration       └─ Long tasks
```

Therefore FrontWatch should eventually think in terms of:

> Application health

rather than:

> Error monitoring

## 4. Finding: The Browser Is a Production Environment

A major insight from the research is that the frontend cannot be treated as a thin presentation layer.

The browser has its own:

- runtime
- memory
- network behavior
- rendering pipeline
- storage
- security model
- device characteristics
- browser-specific behavior

Therefore:

```
Backend healthy  ≠  Frontend healthy
```

And:

```
Developer's environment  ≠  Customer's environment
```

This explains why frontend-specific observability exists as its own category.

## 5. Finding: Reproduction Is a Core Problem

A production bug may depend on:

- User
- Browser
- Device
- OS
- Network
- Location
- Application state
- Authentication state
- Feature flags
- Release
- Backend response
- Timing
- Interaction sequence

Therefore simply giving an engineer:

```
TypeError at checkout.ts:123
```

is insufficient.

The engineer needs the circumstances surrounding the error.

> **Finding:** Production context is part of the bug.
>
> **Confidence:** High · **Impact:** Critical

## 6. Finding: Context Must Be Correlated

Existing market leaders have converged on a similar pattern.

Modern frontend observability connects concepts such as:

```
User → Session → Page → Interaction → Network request → Error → Performance → Release → Backend
```

This means we should not design FrontWatch as an event database where every event exists independently.

We should eventually have a relationship model between telemetry signals.

For example:

```
Error
 ├── occurred during Session
 ├── on Route
 ├── after Navigation
 ├── during API Request
 ├── in Release
 ├── on Browser
 └── affected User
```

This is likely fundamental to the product.

## 7. Finding: Telemetry Alone Isn't the Product

This is probably the most important competitive finding.

The market already has excellent products for:

- errors
- RUM
- performance
- sessions
- network monitoring
- releases
- tracing
- session replay
- backend correlation

Therefore:

> Collecting frontend telemetry is not sufficient differentiation.

The product's value needs to come from what we do with that telemetry.

Conceptually:

```
Telemetry → Context → Correlation → Impact → Detection → Investigation → Action
```

rather than:

```
Telemetry → Dashboard
```

## 8. Finding: Self-Hosting Alone Isn't Differentiation

This assumption has now been explicitly invalidated as a unique positioning strategy.

Sentry already provides a self-hosted distribution.

Therefore:

> "We are self-hosted" is not enough.

The more interesting question is:

> Can we provide a better private deployment model for organizations that need control over their frontend telemetry?

That leads toward:

- simpler deployment
- data ownership
- data residency
- privacy
- network isolation
- governance
- operational simplicity

## 9. Finding: Framework Agnosticism Is Table Stakes

We initially wanted:

- Next.js, React Router, Remix, TanStack Start
- Nuxt, Vue
- Svelte, SvelteKit
- Solid, SolidStart

with SPA, SSR, SSG, Hybrid.

This remains a very important product requirement.

But research shows that framework-agnostic RUM is already achievable. Elastic, for example, explicitly positions its RUM agent as framework-agnostic.

Therefore:

> Framework support is a requirement, not necessarily our differentiator.

## 10. Finding: The SDK Architecture Will Be Crucial

Our framework requirements suggest an architectural separation:

```
                 FRONTWATCH SDK
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    Browser Core          Framework Adapters
          │                     │
          │              ┌──────┼──────┐
          │              ▼      ▼      ▼
          │            Next    Nuxt   Svelte...
          │
          ▼
    Common Telemetry
          │
          ▼
      Collector
```

The browser core should understand things like:

- runtime errors
- network
- performance
- navigation
- browser/device
- security signals

while adapters can understand framework-specific concepts.

This is currently a technical hypothesis, not yet an architecture decision.

## 11. Finding: Alert Quality Is More Important Than Alert Quantity

One of the strongest cross-cutting findings is:

> If engineers don't trust the alerts, they won't trust the platform.

The observability industry continues to identify complexity and alert fatigue as major operational problems.

Therefore:

**BAD**

```
1000 alerts → 5 important
```

is worse than:

**GOOD**

```
12 alerts → 10 important
```

This suggests a future product principle:

> Optimize for signal quality, not telemetry volume.

## 12. Finding: Customer Impact Should Be First-Class

The engineer may care about:

> JavaScript error #29381

But leadership cares about:

> 184 customers affected during payment for 17 minutes

Those are two representations of the same event.

Therefore the system should eventually connect:

```
Technical impact + Customer impact
```

For example:

```
Checkout error
        ↓
1,248 failed sessions
        ↓
742 unique customers
        ↓
18% checkout failure rate
        ↓
Started after release 8.2.1
```

This could become one of FrontWatch's most valuable abstractions.

## 13. Finding: Release Awareness Is Extremely Important

We repeatedly returned to:

> "Did the latest deployment cause this?"

This is a powerful investigation question.

The ideal experience:

```
Deployment 842
      ↓
Frontend health
      ↓
Error rate +312%
      ↓
Performance -21%
      ↓
Affected route /payments
      ↓
Affected browsers Chrome Android
```

That creates a natural relationship:

```
Deployment → Application behavior → Customer impact
```

Release/deployment awareness should therefore be treated as a major capability.

## 14. Finding: Different Users Need Different Views

The same telemetry should not produce the same UI for everyone.

**Engineer** needs:

- What happened?
- Why?
- How do I reproduce it?
- What changed?

**DevOps** needs:

- Is production healthy?
- How severe?
- Who is affected?
- Do I need to respond?
- Has it recovered?

**CTO** needs:

- Are customers affected?
- Are we detecting problems early?
- Are reliability trends improving?
- Can we trust our production systems?

Therefore:

> One telemetry platform, multiple mental models.

## 15. Finding: Trust Is a Core Product Requirement

This has emerged repeatedly.

FrontWatch must be trustworthy in four dimensions:

```
                     TRUST
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
   Accuracy          Signal          Privacy
       │               │               │
       ▼               ▼               ▼
  Correct data      Low noise       Data control
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                 Availability
                       │
                       ▼
                Platform trust
```

This is especially important because FrontWatch itself becomes part of the incident-response system.

## 16. Finding: FrontWatch Must Monitor Itself

This produces an interesting recursive requirement.

```
Customer Application
        ↓
      FrontWatch
```

But: what monitors FrontWatch?

Therefore we eventually need:

```
                 FRONTWATCH
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
Customer telemetry       FrontWatch telemetry
       │                       │
       └───────────┬───────────┘
                   ▼
             Platform health
```

We should eventually know:

- SDK delivery failures
- ingestion failures
- telemetry loss
- processing latency
- storage health
- query latency
- alerting failures
- collector availability

A monitoring system that silently loses monitoring data is dangerous.

## 17. Finding: Privacy Must Be Architectural

For a banking-oriented environment, we cannot simply collect everything and put "Enable PII redaction" in the settings page.

The architecture should assume telemetry may contain sensitive information.

Potentially sensitive data:

- Authorization headers
- Cookies
- Tokens
- Account identifiers
- Form values
- URLs
- Request bodies
- Response bodies
- User information
- Session information

Therefore we should investigate:

- Data minimization
- Automatic redaction
- Allow/deny rules
- Sensitive-field filtering
- URL sanitization
- Payload controls
- Retention policies
- Access controls
- Audit trails

This is a major research area for the next phase.

## 18. Finding: "Banking" Is Still a Hypothesis

We have a strong reason to start with banking.

But we should not yet write:

> "FrontWatch is exclusively a banking monitoring platform."

The broader opportunity may include:

- Banking
- Fintech
- Insurance
- Healthcare
- Government
- Telecom
- Defense
- Enterprise SaaS

The common characteristic might instead be:

> Organizations where frontend telemetry is operationally important and cannot casually be delegated to an external SaaS provider.

That is potentially a much stronger market definition.

## 19. Finding: Operational Simplicity Could Matter

Self-hosting creates another problem.

A customer doesn't necessarily want:

> "Here is a Git repository. Good luck operating Kafka, ClickHouse, Redis, PostgreSQL, workers and everything else."

They want:

```
Deploy → Configure → Instrument → Monitor
```

This is particularly important because Sentry's self-hosted stack itself demonstrates that mature observability systems can have substantial infrastructure requirements.

Therefore a potential competitive opportunity is:

> Private observability without excessive operational burden.

Still a hypothesis.

## 20. Consolidated Problem Statement

Our research now supports the following working problem statement:

> Engineering teams responsible for customer-facing web applications lack sufficiently proactive, contextual, and trustworthy visibility into frontend production health. As a result, frontend failures and performance regressions may be discovered by customers first, while engineers spend significant time reproducing issues, switching between tools, correlating fragmented telemetry, and determining customer impact.

This is much stronger than:

> "Banks need a frontend monitoring tool."

Because it describes the problem, not the proposed solution.

Problem statements are most useful when they provide a basis for evaluating solutions and are grounded in research or clearly labeled assumptions.

## 21. Desired Outcome

The desired transformation is:

**TODAY**

```
Customer → Problem → Report → Investigation → Reproduction → Fix
```

**TARGET**

```
Problem → Detection → Context → Impact → Investigation → Fix → Verification
```

The customer should ideally become the last person to discover a problem — not the first.

## 22. Product Opportunity

The opportunity emerging from discovery is:

> Build a frontend-first observability platform that gives organizations complete, trustworthy visibility into the health and behavior of their deployed web applications while allowing them to maintain control over their telemetry and infrastructure.

The eventual platform should help answer:

- Is the application working?
- Are errors increasing?
- Are customers experiencing failures?
- Which pages are failing?
- Which APIs are failing?
- Is the application getting slower?
- Did the latest deployment cause a problem?
- Which users are affected?
- Which browsers/devices are affected?
- Are there security problems?
- Has the problem recovered?
- Did the fix work?

This is the core question set we have been converging on since the beginning.

## 23. What We Know vs. What We Don't

This distinction is extremely important.

**We know reasonably well:**

- ✓ Frontend failures can be difficult to detect
- ✓ Production reproduction is difficult
- ✓ Context matters
- ✓ Existing observability tools solve many individual problems
- ✓ Alert noise is a real problem
- ✓ Deployment correlation is valuable
- ✓ Different users need different views
- ✓ Privacy/control may be important for regulated organizations

**We don't yet know:**

- ? Exactly how much customers will pay
- ? Which organizations feel the pain most strongly
- ? Whether banking should be the exclusive vertical
- ? Whether self-hosting is a buying requirement
- ? Which deployment model customers actually require
- ? Which telemetry customers consider unacceptable
- ? Which MVP capabilities produce the fastest value
- ? Whether session replay is essential or optional
- ? How much SDK overhead customers will tolerate
- ? What customers consider a "frontend incident"

These unknowns should drive our next discovery work.

## 24. Discovery Decision

At this point, we have enough evidence to move from:

```
IDEA → Research → Assumptions → Findings
```

into:

```
DISCOVERY → PROJECT DEFINITION
```

But there is an important process decision.

We should not jump directly into a huge PRD.

The next step is to formalize the project itself.
