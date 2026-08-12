# Containerization

## Components

Package each executable as an OCI-compatible image:

```text
web
api
ingestion
worker
alert-worker
retention-worker
```

## Requirements

Images should:

- use minimal bases
- run non-root where practical
- contain only required binaries
- have deterministic builds
- expose health endpoints
- use immutable version tags

Prefer:

```text
frontwatch-api:1.4.2
frontwatch-api:<git-sha>
```

over `latest`.

## Security

CI scans images for:

- OS vulnerabilities
- dependency vulnerabilities
- embedded secrets

## Runtime

Configure:

- CPU requests/limits
- memory requests/limits
- readiness
- liveness
- graceful shutdown
