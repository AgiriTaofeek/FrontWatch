# FrontWatch — Security Architecture

**Status:** Draft · Consolidates: `08-architecture/security-architecture.md` + legacy `16-security-and-compliance/README.md`, `threat-model.md`, `tenant-isolation.md`, `compliance-framework.md`. Data-model-level security rules live in `data-model.md` §10; API-level security rules live in `api-contracts.md` §14 — this document is the umbrella threat model and control set both of those implement.

Security is a core product requirement, not an add-on — FrontWatch is intended for banking and other regulated web applications (see `01-project/strategy.md` §3). **Security objectives:** protect telemetry confidentiality · prevent cross-tenant access · minimize sensitive data collection · protect ingestion and APIs from abuse · secure the SDK supply chain · make administrative actions auditable · support customer security controls · make incidents detectable and recoverable.

## 1. Security boundary

```
Customer Browser → Untrusted Input → FrontWatch Boundary → Trusted Processing → Customer Data
```

```
Customer Application → SDK/Browser → Ingestion Boundary → Processing/Queue
    → {PostgreSQL, ClickHouse, Object Storage} → Dashboard/API → Users/Operators
```

Every boundary has an explicit trust model — see `system-architecture.md` §15 for the four trust-boundary breakdown (Browser / Ingestion / Internal Platform / Customer Data).

**Important distinction:** self-hosting reduces third-party exposure, but it does **not** automatically provide encryption, least privilege, tenant isolation, secure defaults, auditability, or vulnerability management — those must be deliberately designed and verified, not assumed to come for free with "we run it ourselves."

## 2. Assets to protect

Telemetry · customer metadata · source maps · application configuration · identity data · alert rules · audit logs · credentials · encryption keys · deployment artifacts.

## 3. Threat actors

External attacker · malicious browser user · compromised customer application · malicious/compromised employee · compromised dependency · compromised deployment pipeline · insider with excessive privileges.

## 4. High-value threats

| ID | Threat | 
|---|---|
| T1 | Cross-tenant data access — attacker obtains telemetry belonging to another organization |
| T2 | Sensitive telemetry exfiltration — telemetry contains customer information and is exposed |
| T3 | Ingestion abuse — attacker floods the ingestion endpoint |
| T4 | Dashboard account compromise — attacker gains access to investigation data |
| T5 | Supply chain compromise — malicious dependency or release artifact compromises deployments |
| T6 | Infrastructure compromise — attacker gains access to Kubernetes or underlying hosts |
| T7 | SSRF / internal network access — an integration causes FrontWatch to make unintended internal requests |
| T8 | Source map exposure — private source code becomes publicly accessible |

Prioritize by `impact × likelihood × detectability`.

## 5. Core security controls

| Control | Requirement |
|---|---|
| **Tenant isolation** | Every customer-owned query scoped to an organization, enforced server-side (see §6) |
| **Authentication** | Dashboard APIs require authenticated users |
| **Authorization** | Permissions checked on every protected resource, before data is returned |
| **Ingestion credentials** | Scoped to telemetry ingestion only; never grant administrative privileges |
| **Encryption** | In transit always; at rest where supported by the deployment environment |
| **Secret management** | Never committed to source control or embedded in frontend dashboard bundles |
| **Input validation** | Telemetry is untrusted browser input — every field treated as hostile until validated |
| **SSRF / URL safety** | Network metadata and user-controlled URLs must never trigger unsafe server-side fetches |
| **XSS protection** | Telemetry displayed in the dashboard (error messages, routes, URLs, metadata) is always safely encoded |
| **Audit logging** | Sensitive administrative operations are auditable |

**Security principle:** the observability system must not become a new source of compromise for the banking application it's meant to protect.

## 6. Tenant isolation (the property that matters most)

```
Organization
 ├── Applications
 │    ├── Environments
 │    └── Projects
 └── Users
```

Every tenant-owned resource has a defensible ownership path. Every protected telemetry query establishes `organization + application/project scope + time/filter constraints` — **a missing tenant predicate is a security defect, not a bug to triage later.** Required automated tests attempt `org_A user → org_B application`, `org_A user → org_B issue`, `org_A API token → org_B ingestion`, and all must fail. Defense in depth: authorization service + repository/query scoping + database permissions + audit logging + automated isolation tests — not any single layer alone.

## 7. Compliance posture

FrontWatch is designed to **support** customer compliance programs, not to claim certification without evidence — "designed for compliance" ≠ "certified compliant." Depending on customer and jurisdiction, relevant frameworks may include ISO 27001, SOC 2, PCI DSS, GDPR/data-protection obligations, local banking regulations, and customer-specific security standards; exact applicability must be assessed with legal/compliance professionals, not assumed (see the caution in `01-project/problem.md` §8). Control domains to map: access control, asset management, logging, incident response, change management, vulnerability management, data protection, backup/DR, supplier risk, secure development. Evidence to maintain: CI security reports, access reviews, deployment records, vulnerability records, backup tests, security tests, audit logs.

## 8. Cross-references

Data-level controls (server-side scoping, safe encoding, audit triggers) → `data-model.md` §10. API-level controls (input validation, resource exhaustion protection, SSRF, audit) → `api-contracts.md` §14. Operational security practices (secrets, upgrades, backups, hardening) → `../08-operations-release/security-hardening.md`.
