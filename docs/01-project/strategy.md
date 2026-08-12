# FrontWatch — Strategy

**Status:** Draft · Consolidates: product-vision, value-proposition, target-market-icp, personas, product-positioning, product-principles, product-goals, roadmap-strategy (legacy `02-strategy/`, 9 files → 1)

## 1. Vision

> FrontWatch gives engineering teams complete, trustworthy visibility into the real-world behavior of their deployed frontend applications — so they can detect, understand, and resolve production problems before customers are forced to report them.

**Fundamental shift:** from monitoring individual events to understanding application health. "Observable" means engineers can answer what/where/when/who/how-many/what-environment/what-was-the-user-doing/what-network-activity/which-release/did-a-deployment-introduce-it/is-it-still-happening/has-it-recovered. "Diagnosable" means moving from *error detected* to *error identified → context found → related events identified → potential cause identified → evidence presented*. "Trustworthy" spans three directions: data trust (telemetry ≈ reality), operational trust (FrontWatch works even during the app's incident), privacy trust (customer knows what's collected, where it goes, who can access it, how long it's kept).

**What FrontWatch should NOT become:** not "Sentry but self-hosted," not "Google Analytics for developers," not "Datadog for everything," not "an AI that watches your app," not "a dashboard factory."

**Strategic test:** the vision should still make sense if you remove the technology, remove "self-hosted," remove "banking," remove "AI," or remove any specific framework — confirming it describes a fundamental outcome, not an implementation detail.

## 2. Value proposition

> For engineering teams operating critical customer-facing web applications, FrontWatch is a private frontend observability platform that detects production problems early, connects the evidence needed to understand customer impact and root causes, and helps teams resolve incidents faster — without requiring them to surrender control of their telemetry.

**One-liner:** Know when your frontend is unhealthy, understand who is affected and why, and fix it before customers tell you.

**Four value pillars:** Detect → Understand → Resolve → Control.

**Table stakes vs. differentiation** (critical for MVP scoping): runtime errors, stack traces, browser/device info, network monitoring, performance monitoring, sessions, releases, alerting, dashboards are all **table stakes** — every serious competitor has them. Candidate **differentiators** (all unvalidated hypotheses, not claims): frontend application health as the primary abstraction, customer-impact intelligence, deployment intelligence, privacy-first architecture, regulated-environment controls, low operational complexity, high-signal detection, unified frontend investigation.

**"Why not just use Sentry / Datadog / build it internally?"** — the honest answer can't be "because we're self-hosted" (see `problem.md` §5). The value must exceed engineering-time-saved, continuous maintenance, framework support, detection quality, and security controls that would otherwise have to be built and operated in-house.

## 3. Target market & ICP

**Target market:** organizations operating mission-critical customer-facing web applications where frontend reliability, performance, security, and telemetry control are important enough to justify dedicated observability infrastructure — potentially banks, fintech, insurance, healthcare, payments, government digital platforms, other regulated enterprises.

**ICP hypothesis:** mid-market to enterprise organizations with dedicated engineering + DevOps teams, meaningful customer traffic, continuously deployed customer-facing applications, complex enough to actually experience production issues, and a real requirement for telemetry control.

**Anti-ICP:** brochure websites, personal projects, very early-stage startups (2 devs, low traffic, no incidents yet), organizations with no clear owner of production reliability.

**Buying committee:** business buyer (CTO/VP Eng), technical buyer (Staff/Principal Engineer, Platform/DevOps/SRE lead), security approval (CISO/Security/Compliance/Risk) — the user of FrontWatch is often not the person who approves it.

**Strongest purchase triggers:** a major production incident that was slow to diagnose; a scaling application (more users/releases/complexity → more uncertainty); a new digital platform wanting observability from day one; existing monitoring proving insufficient on frontend/impact/release/privacy; security or data-residency requirements that block sending telemetry to external SaaS.

**Customer maturity sweet spot:** organizations already at "errors + performance" or "frontend + backend observability" maturity (Level 2–4 of a 0–5 model) — sophisticated enough to understand observability, but still experiencing real frontend-visibility gaps. Level 0 doesn't yet understand the problem; Level 5 likely has sophisticated internal tooling already.

**Segment priority (hypothesis, not validated ranking):** 1) regulated financial organizations, 2) fintech, 3) other regulated enterprises, 4) large enterprise SaaS, 5) large consumer applications.

## 4. Positioning

**Category hypothesis:** *Frontend Production Intelligence* — sitting above generic "frontend observability," answering not just "what telemetry exists?" but "what is happening to our customer-facing application right now, why, who is affected, and what changed?"

**Positioning statement:** For engineering organizations operating critical customer-facing web applications, FrontWatch is a frontend production intelligence platform that provides a unified view of application health, customer impact, failures, performance, and deployments. Unlike general-purpose observability platforms or standalone error monitoring tools, FrontWatch is designed around the frontend application's production experience and can be deployed with organizational control over sensitive telemetry.

**Competitive frame:**
- **Sentry** → strong application monitoring; FrontWatch differentiates on application health / customer impact / deployment intelligence / frontend-first workflows / telemetry control, not "we also capture errors."
- **Datadog / New Relic** → breadth; FrontWatch doesn't compete on breadth, it goes deep on frontend production intelligence specifically.
- **Grafana + OpenTelemetry** → powerful but requires the customer to assemble and operate the whole pipeline themselves; FrontWatch's opportunity is delivering that experience pre-built for private deployment.
- **Internal tooling** → the hardest competitor (costs engineering time, not a subscription); must reduce build+maintain+operate+improve cost, not just "give you a dashboard."

**Messaging pillars:** Application Health ("know when your frontend is actually unhealthy") · Customer Impact ("know who is affected") · Production Diagnosis ("stop reconstructing incidents manually") · Deployment Intelligence ("know when a deployment changed application health") · Telemetry Control ("keep control of your production telemetry").

**Claims to avoid until evidenced:** "most secure," "fastest," "only self-hosted solution," "the best Sentry alternative," "guaranteed detection before customers," "AI-powered root cause analysis."

## 5. Product principles (the ones that actually decide things)

Decision hierarchy when priorities conflict: **customer reliability → customer impact → engineering action → data trustworthiness → privacy & security → product usability → scale & cost → feature breadth.**

The five that dominate:
1. **Trust** — telemetry and conclusions must be trustworthy; evidence before intelligence, never hide the evidence behind a conclusion.
2. **Impact** — optimize for customer impact understood, not event volume collected.
3. **Privacy** — privacy by architecture, not a settings page; data minimization by default; the customer owns the telemetry.
4. **Investigation** — minimize the distance between detection and understanding; context over raw data; correlation is first-class, not an afterthought; release awareness everywhere ("what changed?").
5. **Reliability** — FrontWatch must itself be observable and dependable, must fail gracefully (SDK failure ≠ application failure), and must stay low-overhead (it cannot degrade the thing it monitors).

Supporting principles worth keeping visible during design review: framework-agnostic but runtime-aware; instrument once, understand everywhere (complexity lives in FrontWatch, not the customer's app); progressive complexity (simple by default, deep for experts); one source of truth, multiple role-specific views; API-first; open standards where they help, not for their own sake; build the *smallest useful system* (a complete value loop), not the smallest possible product; prioritize complete workflows over feature checklists; don't build for the demo; prefer boring, predictable infrastructure; scale without premature complexity.

**Product decision test** before approving a feature: what problem does it solve, which persona needs it, does it improve detect/understand/resolve/prevent/verify, does it increase customer-impact understanding, what data does it require and does that create privacy risk, can users see why the system reached its conclusion, does it add operational complexity, is it necessary *now* — if not, it goes on the roadmap, not the MVP.

## 6. Goals & metrics

**North Star (hypothesis):** customer-impacting frontend incidents proactively detected and sufficiently understood before the customer reports them. Deliberately avoids rewarding raw telemetry volume.

**Core metric chain:**
- **MTTD** (Mean Time to Detect) — problem begins → FrontWatch detects.
- **MTTU** (Mean Time to Understand) — problem detected → engineer understands likely cause. *This is the one FrontWatch is specifically trying to compress*, distinct from traditional MTTD/MTTR-only tracking.
- **MTTR** (Mean Time to Resolution) — problem begins → detection → investigation → fix → recovery.

**Supporting goals:** improve customer-impact awareness (% incidents with affected-user/route/browser estimates); improve deployment confidence (% incidents correlated to a release, false-positive regression rate); detect meaningful performance degradation, not collect every metric that exists; reduce customer-reported-incident rate; keep FrontWatch itself reliable (telemetry delivery success rate, alert delivery success rate, processing latency, data loss rate, availability); minimize SDK overhead (bundle/CPU/memory/network/startup impact, with explicit budgets set during technical design); protect customer data (PII redaction coverage, leakage incidents, audit coverage); reduce integration friction (time to first telemetry, time to first useful insight); improve alert precision, not alert count.

**Explicitly not optimized for:** event volume, dashboard count, alert count, number of supported frameworks, feature count, AI-usage volume — none of these equal customer value on their own.

**MVP success test:** engineering teams can use FrontWatch to detect a meaningful frontend production problem and reach a useful understanding of what happened *faster than their existing workflow* — not merely "we built an SDK/API/dashboard."

## 7. Roadmap (capability maturity, not calendar dates)

> Do not build the next layer until the previous layer provides a reliable enough foundation to support it.

| Stage | Objective | Representative capabilities |
|---|---|---|
| **MVP / Foundation** | Answer "what happened to my frontend application?" | SDK (errors, promise rejections, breadcrumbs, sessions, navigation, network, performance, browser/device, release context) + ingestion/processing/storage + issue grouping + query API + dashboard + investigation view + basic alerting |
| **V1 — Observability** | Move from "I can investigate an error" to "I understand my whole application's health" | Application/environment/route/API-dependency/browser/release health views; advanced Web Vitals & route/resource/interaction performance; release comparison & regression detection; custom dashboards; threshold/anomaly/error/performance/release/health alerts |
| **V2 — Proactive Reliability** | Move from detecting problems to predicting/preventing them | Learned-baseline anomaly detection (not just static thresholds); automatic deployment regression evaluation (before/after comparison); CI/CD-integrated release monitoring (pass/warn/fail, canary, rollback signals); reliability/error/performance budgets |
| **V3 — Intelligent Debugging** | Reduce manual reasoning during investigation | AI investigation *grounded in retrieved evidence* (never "AI → guess" — always telemetry → correlation → evidence → AI reasoning → explanation, with evidence inspectable); investigation assistant Q&A; automated root-cause analysis (kept probabilistic/evidence-based); suggested next actions |
| **Enterprise** | Developer tool → organization-wide reliability platform | Orgs/teams/projects/roles/SSO/SAML/SCIM/audit logs; retention policies, data residency, encryption, key management, tenant isolation, PII/redaction policies; multiple deployment models (self-hosted, private cloud, air-gapped); compliance work (SOC 2, ISO 27001, PCI-related controls, GDPR, NDPR — validated against actual target markets, not assumed) |
| **Long-term** | Continuous frontend reliability platform | "Application digital twin" relationship graph (user→session→route→component/API→resource/backend→performance→error→release); continuous reliability evaluation instead of waiting for incidents; automated reliability gates in the deploy pipeline (safe/risky/dangerous → continue/warn/block) |

**Prioritization test for any proposed capability:** customer impact × frequency × severity × differentiation × strategic alignment × technical cost × privacy impact × operational complexity. **The rule:** a feature moves forward when it strengthens the core reliability loop (observe → detect → understand → resolve → prevent → verify) or creates a strategically important adjacent capability — not because it sounds impressive in a demo. Resist building complex AI agents, full session replay, full backend APM, a full SIEM, product analytics, infrastructure monitoring, or dozens of integrations before the core loop is proven.

**Competitive-narrative progression:** "we monitor frontend errors" → "we understand frontend application health" → "we detect frontend regressions automatically" → "we help engineers understand why problems happened" → "we help organizations prevent frontend reliability problems." Monitoring is the foundation; reliability is the destination.
