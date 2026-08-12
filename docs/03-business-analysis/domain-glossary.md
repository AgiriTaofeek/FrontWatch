# FrontWatch — Domain Glossary & Entities

**Status:** Draft · Consolidates: domain-glossary.md + domain-entities.md (legacy `07-data-domain/`)

Shared vocabulary for the whole product — BA, UX, and engineering should all mean the same thing by these terms. Storage representation is decided later in `05-architecture/data-model.md`; this is the conceptual domain layer only.

| Entity | Definition | Key attributes | Relationships |
|---|---|---|---|
| **Organization** | The customer/company boundary in FrontWatch | id, name, status, created_at, updated_at | has many Memberships, Applications |
| **User** | A human who uses the FrontWatch platform | — | has many Memberships |
| **Membership** | A user's relationship with an organization, including role and access | id, organization_id, user_id, role, status, created_at | connects User ↔ Organization |
| **Application** | A frontend product being monitored | id, organization_id, name, framework, status, created_at, updated_at | belongs to Organization; has many Environments |
| **Environment** | A deployment context (development / staging / production) | — | belongs to Application |
| **Project** | The SDK/telemetry identity used to associate incoming data with an application/environment | (storage representation deferred) | — |
| **Release** | A version of application code | id, application_id, version, commit_sha, source_version, created_at | belongs to Application |
| **Deployment** | The act of putting a Release into an Environment (a release ≠ a deployment — the same release can have multiple deployments) | id, release_id, environment_id, deployed_at, deployment_source, metadata | connects Release ↔ Environment |
| **Event** | The canonical raw telemetry envelope; payload shape varies by event_type | event_id, organization_id, application_id, environment_id, release_id, session_id, timestamp, event_type, route, browser, device | — |
| **Error** | An observed frontend failure | message, exception type, stack trace, fingerprint, source location, metadata | occurs within an Event |
| **Issue** | A logical grouping of related error Occurrences — not an individual event | — | has many Occurrences |
| **Occurrence** | One observed instance belonging to an Issue; connects the issue to an event and its contextual entities | — | belongs to Issue |
| **Session** | A browser/application activity boundary used to reconstruct what happened during a user's experience | — | has many Breadcrumbs, Network Requests, Performance Samples, Errors |
| **Breadcrumb** | A contextual event in a session timeline | category: navigation / interaction / network / error / performance / custom | belongs to Session |
| **Network Request** | Observable browser-side communication with a resource or API; sensitive payloads excluded by default | method, normalized URL/resource, status, duration, timestamp, session, release, environment | belongs to Session |
| **Performance Sample** | A captured frontend performance measurement | LCP, CLS, INP, FCP, navigation timing, resource timing, long task | belongs to Session/route |
| **Health (Health Snapshot)** | A *derived* representation of application operating condition over a time window — computed from underlying evidence, never treated as primary telemetry | — | derived from Errors + Performance + Network + Releases |
| **Alert Rule** | A configured condition that can trigger a notification, e.g. `error_rate > threshold for N minutes` | — | — |
| **Alert** | An evaluated occurrence of an Alert Rule | states: triggered / acknowledged / recovered / resolved | belongs to Alert Rule |
| **Correlation** | A relationship between observations/entities that may help explain behavior — **evidence, not automatic proof of causation** | e.g. Issue↔Release, Issue↔Session, Issue↔Network Request, Performance Regression↔Release | — |
| **Telemetry** | The overall stream of observations produced by monitored applications (the superset Event belongs to) | — | — |
