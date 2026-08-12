# FrontWatch — Observability & Operations

**Status:** Draft · Consolidates all of legacy `18-observability-and-operations/` (sli-slo, alerting-strategy, on-call, incident-management, runbook-framework, postmortems, ingestion/queue/storage/query-health, data-freshness, error-budgets, escalation, operational-kpis, operational-readiness, anomaly-detection, internal-dashboards, capacity-monitoring, deployment-monitoring, operations-risks)

**Operational principle:** `Customer application → FrontWatch → FrontWatch observes customer health → FrontWatch observes FrontWatch's own health`. The second layer is mandatory, not optional — see `../01-project/charter.md` Principle 6 and `../05-architecture/system-architecture.md` §14.

**Operational goals:** detect FrontWatch failures before customers report them · understand ingestion health · detect queue backlog · detect storage degradation · understand query performance · operate safe deployments · forecast capacity · provide actionable alerts · reduce MTTR. **Core signals:** availability, latency, error rate, throughput, queue lag, data freshness, storage utilization, resource saturation.

## SLIs & SLOs

An SLI is a measurable signal (API availability, API latency, ingestion acceptance, telemetry freshness, query success, query latency); an SLO is the target (e.g. "99.9% successful API requests over 30 days" — exact targets set after production measurement and customer requirements, not guessed upfront). **Define SLOs independently per service** — Dashboard/API, Ingestion, Processing, Query, Alerting — because telemetry ingestion and dashboard availability are genuinely different reliability dimensions; a dashboard outage does not mean telemetry is being lost. Every SLO has an owner, measurement, target, window, alert policy, and escalation path.

**Error budgets:** the amount of unreliability an SLO permits (e.g. a 99.9% monthly target allows ~0.1% downtime as budget). When the budget is healthy, feature velocity continues; when exhausted, reliability work takes priority and risky changes pause. Track budget consumption over time — this is what connects product delivery decisions to operational reliability in a measurable way, not just as a slogan.

## Alerting strategy

Categories: availability, latency, error rate, queue, storage, capacity, security, backup, certificate, deployment. Every alert answers: what is wrong? how severe? what is affected? what should I check? **Don't alert on every transient error** — prefer sustained symptoms and actionable thresholds. Severity levels: critical, warning, info. Group related alerts to prevent alert storms; auto-resolve when the underlying condition recovers.

## Component health signals

| Component | Track |
|---|---|
| **Ingestion** | Are events arriving/being accepted/reaching the queue? requests/sec, events/sec, bytes/sec, 4xx, 5xx, rate limiting, queue publish failures. `SDK traffic normal + ingestion accepted normal + queue lag rising` → downstream processing trouble, not a customer SDK problem — a useful diagnostic pattern, not a coincidence. |
| **Queue** | queue depth, consumer lag, publish latency, consumer throughput, retry count, dead-letter count. Healthy = incoming rate ≈ processing throughput with bounded lag; warning = sustained incoming > processing. Monitor recovery *rate* after an outage, not just current lag. |
| **Storage** | PostgreSQL (availability, connections, latency, locks, replication, disk, backup status); ClickHouse (availability, insert/query latency, parts/merge pressure, disk, replication, failed queries); object storage (availability, capacity, request failures, source-map/backup operations). Storage can be technically available while queries are unusably slow — both matter. |
| **Query** | query count, success/failure, latency p50/p95/p99, timeout count, rows/bytes scanned, result size — tracked per query class (health, issues, sessions, performance, network, alerts). Guardrails: timeouts, max ranges, result limits, concurrency controls. |
| **Data freshness** | delay between event timestamp and queryable — measured separately for errors, network, performance, sessions, aggregates. A platform that's *available but stale* must never be represented as healthy; alert when freshness exceeds the agreed SLO. |

## Anomaly detection

Purpose: catch unusual behavior before fixed thresholds fail. Candidate signals: ingestion volume, error rate, queue lag, query latency, storage growth, worker throughput. Start with simple statistical/baseline methods (moving average, percent change, seasonal baseline) — **don't introduce complex ML just because the product happens to be an observability platform.** Must account for deployments, known traffic patterns, maintenance, customer onboarding, scheduled jobs — and every anomaly must show *why* it was flagged, not just that it was.

## Internal dashboards

Platform overview (API/ingestion/queue/worker/storage/query health) · ingestion dashboard (events/sec, accepted/rejected, payload bytes, latency, queue publish failures) · processing dashboard (throughput, queue lag, worker utilization, processing latency, retries, dead letters) · storage dashboard (PostgreSQL/ClickHouse/object storage, disk, capacity, query latency) · deployment dashboard (version, deployment status, error rate, latency, restart count, health changes).

## Capacity monitoring

Monitor CPU, memory, disk, database connections, ClickHouse storage, queue retention, ingestion throughput, query concurrency. Track trends, not just current utilization — storage days remaining, queue capacity remaining, expected monthly growth. Warning and critical thresholds need sufficient lead time. Regularly review growth, customer count, events/day, retention, query load. **Goal: capacity problems are identified before they become incidents**, not after.

## Deployment monitoring

Before: record version, commit, configuration change, migration, expected impact. During: monitor pod health, error rate, latency, restarts, ingestion, queue. After: compare before-vs-after for key SLIs. Every deployment is associated with subsequent health changes so regressions are attributable — define explicit conditions under which an automated or human rollback should be considered.

## On-call, incident management & postmortems

On-call engineers inspect platform health, identify the affected component, follow the runbook, mitigate, escalate, and document — the system pages a human only when human intervention is reasonably required. Rotation: primary, secondary, escalation. Handoffs cover active incidents, degraded systems, planned deployments, capacity concerns, security concerns. Track pages, acknowledgement time, MTTR, false positives, repeat incidents.

**Incident lifecycle:** detection → triage → severity → incident owner → mitigation → root-cause investigation → recovery → postmortem. Larger incidents get an Incident Commander, Technical Lead, Communications, and Scribe (one person can hold multiple roles on a small team). Communicate what happened, impact, current mitigation, and next update, with timestamps on major events. Don't close an incident just because symptoms disappeared — capture follow-up work explicitly.

**Escalation levels** (adjust to team size): L1 on-call engineer → L2 platform/backend specialist → L3 security/infrastructure lead → L4 engineering leadership. Triggers: SLO breach, security incident, data integrity concern, prolonged ingestion outage, storage exhaustion, customer-wide impact. Critical incidents get explicit response deadlines; every active incident has exactly one clearly identified owner.

**Runbook structure:** title, symptoms, impact, likely causes, initial checks, detailed investigation, mitigation, recovery, verification, escalation, post-incident actions. Example (queue lag): checks are queue depth, consumer health, worker errors, ClickHouse latency, worker CPU/memory; mitigation may be scale workers, restore the dependency, or reduce expensive workloads. Runbooks are tested by someone who didn't write them.

**Postmortems** (blameless): summary, impact, timeline, detection, root cause, contributing factors, what went well, what went poorly, corrective actions, owners, due dates. Always ask: could FrontWatch have detected this earlier? which signal was missing, which alert was noisy, which dashboard was insufficient? Corrective actions become tracked engineering work, not a paragraph nobody revisits.

## Operational KPIs

Reliability (availability, SLO attainment, error budget consumption, incident count) · Performance (API/ingestion/query/processing latency) · Data (event throughput, rejection rate, freshness, processing success) · Operations (MTTD, MTTA, MTTR, deployment frequency, change failure rate) · Capacity (storage growth, CPU/memory utilization, queue capacity). **KPIs should drive decisions, not become vanity metrics** — the same discipline as `../01-project/strategy.md` §6.

## Operational readiness review (before production)

Reliability: SLOs defined, alerts defined, runbooks exist, on-call exists. Data: backup tested, restore tested, retention configured, freshness monitored. Security: access controls, audit logs, security scanning, incident response. Deployment: CI/CD, rollback, migration strategy, upgrade path. Capacity: load tested, storage sized, growth monitored. Every critical component has a named operational owner.

## Operational risks

| Risk | Mitigation |
|---|---|
| FrontWatch cannot observe itself | Independent platform metrics, dashboards, alerts |
| Alert storm | Grouping, deduplication, actionable thresholds |
| Silent data staleness (looks healthy, isn't) | Freshness SLIs/SLOs, never silently reported as healthy |
| Capacity exhaustion | Forecasting and early warnings |
| Slow incident response | Runbooks, on-call, clear ownership |
| Deployment regression | Deployment markers + post-deploy health comparison |
| Monitoring dependency failure | Layered health checks and independent infrastructure monitoring |
