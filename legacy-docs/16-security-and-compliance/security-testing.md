# Security Testing

## Automated

Run:

```text
SAST
dependency scanning
secret scanning
container scanning
SBOM generation
```

## Application Tests

Test:

- authorization bypass
- tenant isolation
- injection
- XSS
- SSRF
- rate limiting
- oversized payloads

## SDK Tests

Test:

- redaction
- unsafe DOM content
- malformed input
- credential boundaries
- CSP behavior

## Infrastructure

Test:

- Kubernetes RBAC
- network policies
- exposed services
- image configuration
- secret access

## Penetration Testing

Before major production readiness milestones, conduct independent penetration testing appropriate to the deployment and customer risk profile.
