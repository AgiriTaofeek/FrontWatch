# Infrastructure Security Hardening

## Network

- private databases
- explicit network policies
- restricted ingress
- restricted egress where appropriate

## Containers

- non-root
- minimal images
- vulnerability scanning
- immutable tags

## Kubernetes

- RBAC
- pod security controls
- network policies
- resource limits
- audit logging where required

## Storage

Use encryption at rest and restricted access.

## Supply Chain

Verify source, dependencies, images, and deployment artifacts.

Administrative access should follow least privilege and be auditable.
