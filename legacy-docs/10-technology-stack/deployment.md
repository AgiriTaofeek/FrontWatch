# Deployment Technology

## Containers

Use Docker-compatible OCI containers for application packaging.

## Kubernetes

Use Kubernetes as the production orchestration target for larger/self-hosted enterprise deployments.

Kubernetes provides declarative management of containerized workloads, services, storage, networking, and security controls.

## Deployment Profiles

### Development

```text
Docker Compose
```

Goal:

- one-command local development
- low operational complexity

### Small Production

Potentially:

```text
single Kubernetes node
or
VM-based container deployment
```

depending on customer requirements.

### Enterprise

```text
Kubernetes cluster
      ↓
Load Balancer
      ↓
FrontWatch services
      ↓
Redpanda
      ↓
ClickHouse
      ↓
PostgreSQL
      ↓
Object Storage
```

## Infrastructure as Code

Use Terraform/OpenTofu-compatible infrastructure definitions where applicable.

## Kubernetes Packaging

Use Helm charts for production deployment.

## Upgrade Strategy

Support:

- versioned images
- database migrations
- configuration versioning
- rolling upgrades where safe
- documented rollback
