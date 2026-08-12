# Application & Configuration API

## Applications

```text
POST   /api/v1/applications
GET    /api/v1/applications
GET    /api/v1/applications/{id}
PATCH  /api/v1/applications/{id}
DELETE /api/v1/applications/{id}
```

## Environments

```text
POST   /api/v1/applications/{id}/environments
GET    /api/v1/applications/{id}/environments
PATCH  /api/v1/environments/{id}
DELETE /api/v1/environments/{id}
```

## Projects

```text
POST /api/v1/applications/{id}/projects
GET  /api/v1/applications/{id}/projects
```

Project credentials must never be returned unnecessarily.

## Releases

```text
POST /api/v1/applications/{id}/releases
GET  /api/v1/applications/{id}/releases
GET  /api/v1/releases/{id}
```

## Deployments

```text
POST /api/v1/releases/{id}/deployments
GET  /api/v1/environments/{id}/deployments
```

## Configuration

Application configuration should be separated from telemetry ingestion.

Examples:

- sampling defaults
- privacy rules
- retention configuration
- alert configuration
- SDK settings
