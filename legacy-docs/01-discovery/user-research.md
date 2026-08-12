# User Research

## 1. Research Objective

The purpose of this research is to understand the three initial user groups:

- Software Engineers
- DevOps Engineers
- CTO / Engineering Leadership

We need to understand:

- What each user is trying to accomplish.
- What problems they encounter today.
- What information they need.
- What makes production investigation difficult.
- What they would expect from an observability platform.
- What would make them trust or distrust FrontWatch.
- What information should be surfaced differently for each role.

## 2. User Group 1 — Software Engineer

### Primary Job

The software engineer's fundamental job is:

> Find, understand, fix, and verify production problems as quickly as possible.

The engineer generally doesn't care about telemetry for its own sake.

They care about answering:

```
Something broke.
        ↓
What broke?
        ↓
Where?
        ↓
Why?
        ↓
Who is affected?
        ↓
Can I reproduce it?
        ↓
What changed?
        ↓
How do I fix it?
        ↓
Did my fix actually work?
```

This aligns strongly with our original discovery conversation.

## 3. Current Engineer Workflow

Based on your actual workflow:

```
Customer reports problem
        ↓
Developer receives report
        ↓
Try to reproduce
        ↓
Can't always reproduce
        ↓
Check logs
        ↓
Search for errors
        ↓
Gather context manually
        ↓
Investigate
        ↓
Identify root cause
        ↓
Implement fix
        ↓
Deploy
        ↓
Wait/check whether problem disappears
```

The largest weakness is the information gap between production and the developer.

The engineer wasn't present when the problem occurred.

They are effectively trying to reconstruct an event after the fact.

## 4. The Reproduction Problem

This deserves special attention.

A production frontend problem can depend on:

```
Browser
  +
Operating system
  +
Device
  +
Location
  +
Network
  +
Application state
  +
User state
  +
Feature flags
  +
Application version
  +
Backend response
  +
Timing
  +
User interaction sequence
```

Therefore:

```
Developer's machine
        ≠
Customer's environment
```

A Reddit discussion from frontend practitioners describes exactly this type of problem: teams using Sentry for exceptions and another product for session recording still found it difficult to connect exceptions to sessions and reproduce rare browser/user scenarios.

This validates something we already identified:

> Production context is part of the bug.

The error message alone is often insufficient.

## 5. Engineer's Desired Experience

The ideal workflow becomes:

```
FRONTWATCH ALERT
"Checkout failures increased 380%"
             ↓
Engineer opens incident
             ↓
Sees:
  ├── Error
  ├── Stack trace
  ├── Release
  ├── Route
  ├── User impact
  ├── Browser
  ├── Device
  ├── Network request
  ├── Backend response
  ├── Session context
  └── Timeline
             ↓
"Started after release 4.8.2"
             ↓
Inspect deployment
             ↓
Identify problematic change
             ↓
Fix
             ↓
Deploy 4.8.3
             ↓
FrontWatch confirms recovery
```

This is the experience we should optimize for.

## 6. Engineer Pain Points

### P1 — Reactive Discovery

The engineer often learns about problems after customers do.

**Severity:** Critical

### P2 — Reproduction Difficulty

Some bugs only occur under specific:

- browsers
- devices
- network conditions
- user states
- routes
- timing conditions

**Severity:** Critical

### P3 — Fragmented Context

The engineer may need to move between:

- Sentry
- Browser DevTools
- Logs
- APM
- Analytics
- GitHub
- CI/CD
- Deployment platform
- Support ticket

Modern observability practitioners describe this as a common problem: logs, APM, errors, and other signals can be spread across multiple tools, creating context switching during incidents.

### P4 — Too Much Telemetry

More telemetry does not automatically mean better observability.

If the system generates too many low-value alerts, engineers stop trusting it.

This is a well-established observability problem, commonly called alert fatigue.

Interestingly, a recent Gartner Peer Insights review of Sentry from a banking VP of Engineering specifically praised its capability while criticizing the effort required to reach a high-signal/low-noise state.

That is particularly relevant to our target environment.

## 7. What Engineers Value

Our research suggests the engineer's priority hierarchy is approximately:

1. Accurate problem detection
2. Fast investigation
3. High-quality context
4. Root-cause identification
5. User impact
6. Release correlation
7. Performance insight
8. Historical trends
9. Customization

This is important.

The dashboard shouldn't begin with:

> "Here are 47 different charts."

It should begin with:

> "Here are the things that need your attention."

## 8. User Group 2 — DevOps Engineer

The DevOps user's job is different.

Their fundamental question is:

> "Is the production system healthy, and can I reliably operate it?"

The DevOps engineer cares about:

- Availability
- Performance
- Reliability
- Deployment health
- Infrastructure
- Telemetry pipeline
- Alerting
- Capacity
- Incident response
- Security

But for FrontWatch specifically, their focus is the frontend production boundary.

## 9. DevOps Workflow

A likely workflow is:

```
Deployment
   ↓
Observe application
   ↓
Monitor telemetry
   ↓
Detect anomaly
   ↓
Determine severity
   ↓
Determine affected service/application
   ↓
Alert appropriate team
   ↓
Investigate
   ↓
Coordinate response
   ↓
Verify recovery
```

Their biggest concern is likely not:

> "Show me every frontend error."

It is:

> "Tell me when the frontend is unhealthy enough that I need to act."

## 10. DevOps Pain Point — Alert Noise

This is particularly important.

DevOps teams can receive huge volumes of alerts.

The problem isn't simply the number of alerts.

It's:

> Signal quality.

IBM describes alert fatigue as operational exhaustion caused by overwhelming alert volumes and emphasizes that poor-quality, context-poor telemetry contributes to the problem.

Recent practitioner discussions similarly describe teams receiving hundreds of alerts across multiple monitoring systems, eventually losing trust in the monitoring itself.

Therefore:

> FrontWatch must not optimize for "detect everything."

It should optimize for:

> Detect everything important while minimizing noise.

That's a very different engineering objective.

## 11. DevOps Needs

The DevOps user should be able to answer:

```
Is the application healthy?
        ↓
Is something abnormal?
        ↓
How severe is it?
        ↓
How many customers are affected?
        ↓
Which application/environment?
        ↓
Which release?
        ↓
Did a deployment trigger it?
        ↓
Who needs to investigate?
        ↓
Has the problem recovered?
```

## 12. User Group 3 — CTO

The CTO isn't going to spend 30 minutes examining a JavaScript stack trace.

Their job is different.

The CTO asks:

```
Are our applications reliable?
        ↓
Are customers experiencing problems?
        ↓
Are we detecting incidents early?
        ↓
Are engineers resolving them quickly?
        ↓
Are we improving?
        ↓
Is our production data secure?
        ↓
Can I trust this system?
```

## 13. CTO's Desired View

The CTO's dashboard should eventually be dramatically different from the engineer's.

For example:

```
                    PLATFORM HEALTH

Overall Health                   99.97%
Customer-impacting incidents          2
Frontend error rate                ↓ 18%
Performance                        ↑ 12%
Active incidents                      1
Affected customers                 0.03%
Latest deployment                Healthy
MTTR                               ↓ 31%
Critical security events              0
```

The CTO needs outcomes, not telemetry.

## 14. CTO Pain Points

### P1 — Lack of Confidence

Leadership needs confidence that:

> "If something important breaks, we'll know."

That is different from simply having a monitoring dashboard.

### P2 — Customer Impact

The CTO cares about:

- How many customers?
- Which customers?
- Which critical journeys?
- How much business impact?

### P3 — Risk

For a banking environment, the organization also needs confidence around:

- Where does telemetry go?
- Who can access it?
- How long is it retained?
- Can sensitive information leak?
- Can we audit access?
- Can we control the infrastructure?

This makes telemetry governance a potential executive-level requirement rather than just a security-engineering concern.

## 15. Role Comparison

| Need | Software Engineer | DevOps | CTO |
|---|---|---|---|
| Error details | 🔴 Critical | 🟡 Useful | 🟢 Summary |
| Stack traces | 🔴 Critical | 🟡 | ⚪ |
| Session context | 🔴 Critical | 🟡 | ⚪ |
| Network details | 🔴 Critical | 🔴 | 🟡 |
| Performance | 🔴 | 🔴 | 🔴 |
| Release health | 🔴 | 🔴 | 🔴 |
| Deployment correlation | 🔴 | 🔴 | 🔴 |
| Alerting | 🔴 | 🔴 | 🟡 |
| Application health | 🔴 | 🔴 | 🔴 |
| Customer impact | 🔴 | 🔴 | 🔴 |
| Infrastructure health | 🟡 | 🔴 | 🟡 |
| Security/privacy | 🟡 | 🔴 | 🔴 |
| Telemetry governance | 🟢 | 🔴 | 🔴 |
| Root cause | 🔴 | 🔴 | 🟡 |
| Business-level trends | 🟢 | 🟡 | 🔴 |

**Legend:** 🔴 Primary · 🟡 Important · 🟢 Useful · ⚪ Low priority

## 16. Jobs-to-Be-Done

We're now beginning to see the actual jobs rather than just features.

**Software Engineer**

> When a production frontend problem occurs, I want to understand exactly what happened and why, so I can fix it without spending hours reproducing the problem manually.

**DevOps**

> When the frontend begins behaving abnormally, I want to know quickly whether it represents a real customer-impacting incident, so I can coordinate the right response without drowning in alerts.

**CTO**

> When I need to understand the health of our customer-facing applications, I want trustworthy production intelligence and clear customer impact, so I can make decisions about reliability, risk, and engineering investment.

These are much more valuable than simply saying:

> "Engineer needs error monitoring."

## 17. The User Journey We Are Discovering

The three roles ultimately participate in the same lifecycle:

```
                     PRODUCTION EVENT
                           │
                           ▼
                     FRONTWATCH DETECTS
                           │
                           ▼
                    CLASSIFY / GROUP
                           │
                           ▼
                    DETERMINE IMPACT
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         Engineer        DevOps         CTO
             │             │             │
             ▼             ▼             ▼
         Diagnose       Operate       Understand
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                         FIX
                           │
                           ▼
                       DEPLOY
                           │
                           ▼
                     VERIFY HEALTH
```

This is potentially the central user journey of FrontWatch.

## 18. Trust Is a Product Requirement

One finding deserves to become a major product principle:

> Trust.

If FrontWatch tells an engineer:

> "Your application is healthy."

and the application is actually failing, the platform has failed.

If FrontWatch generates thousands of irrelevant alerts, engineers stop listening.

If FrontWatch loses telemetry during a production incident, engineers cannot trust the investigation.

If FrontWatch leaks sensitive telemetry outside the organization's control, the security model has failed.

Therefore:

```
                FRONTWATCH TRUST
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    Accuracy      Signal       Privacy
       │            │            │
       ▼            ▼            ▼
  Correct data   Low noise   Data control
       │            │            │
       └────────────┼────────────┘
                    ▼
              Engineer trust
```

This may eventually become one of our Product Principles.

## 19. Research Finding: Observability ≠ Data Collection

The research strongly reinforces a distinction we've been discovering throughout this process.

A platform can collect:

> 10 million events

and still provide poor observability.

What users actually need is:

```
Event
 ↓
Context
 ↓
Correlation
 ↓
Impact
 ↓
Explanation
 ↓
Action
```

This is particularly important because current observability discussions increasingly focus on alert noise, context, and reducing the burden of manual incident triage.

## 20. User Research Findings

Our current findings are:

**Finding 1**
Engineers need production context, not merely error messages.

**Finding 2**
Reproduction is a major source of wasted engineering time.

**Finding 3**
Telemetry fragmentation increases investigation time.

**Finding 4**
Alert volume without context destroys trust.

**Finding 5**
DevOps needs actionable health signals rather than raw event streams.

**Finding 6**
CTOs need trustworthy health, impact, reliability and governance information.

**Finding 7**
Different users need different representations of the same underlying telemetry.

**Finding 8**
Privacy and telemetry ownership are potentially first-class requirements for regulated organizations.

**Finding 9**
The product's value is not collecting data; it is turning production behavior into actionable understanding.

## 21. Emerging Product Principle

I would record this now, although we'll formalize product principles later:

> FrontWatch should optimize for time-to-understanding, not volume of telemetry.

The user shouldn't have to ask:

> "Which of these 10,000 events matters?"

The platform should help answer:

> "This is what matters right now, this is who is affected, this is what changed, and this is where you should investigate."

That is a potentially powerful foundation.

## 22. Important Research Limitation

We should be disciplined here.

We currently have:

- your real-world experience,
- competitor research,
- practitioner discussions,
- industry evidence.

But we do not yet have direct interviews with multiple engineers, DevOps engineers, or CTOs.

Therefore, these are research findings/hypotheses, not statistically validated market truths.

That distinction matters before we make expensive product decisions.
