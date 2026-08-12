# Threat Model

## Assets

Protect:

```text
telemetry
customer metadata
source maps
application configuration
identity data
alert rules
audit logs
credentials
encryption keys
deployment artifacts
```

## Threat Actors

Consider:

```text
external attacker
malicious browser user
compromised customer application
malicious/compromised employee
compromised dependency
compromised deployment pipeline
insider with excessive privileges
```

## High-Value Threats

### T1 — Cross-Tenant Data Access

Attacker obtains telemetry belonging to another organization.

### T2 — Sensitive Telemetry Exfiltration

Telemetry contains customer information and is exposed.

### T3 — Ingestion Abuse

Attacker floods the ingestion endpoint.

### T4 — Dashboard Account Compromise

Attacker gains access to investigation data.

### T5 — Supply Chain Compromise

Malicious dependency or release artifact compromises deployments.

### T6 — Infrastructure Compromise

Attacker gains access to Kubernetes or underlying hosts.

### T7 — SSRF / Internal Network Access

An integration causes FrontWatch to make unintended internal requests.

### T8 — Source Map Exposure

Private source code becomes publicly accessible.

## Security Priority

Prioritize threats based on:

```text
impact × likelihood × detectability
```
