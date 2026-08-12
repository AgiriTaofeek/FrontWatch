# CI/CD Environments

## Local

Developer-controlled.

## Development

Fast feedback and continuous deployment may be appropriate.

## Staging

Should resemble production enough to detect deployment and integration problems.

## Production

Requires explicit promotion/approval according to customer policy.

## Configuration

Environment configuration must not require source-code changes.

## Database Migrations

Validate migrations before production.

Application rollback and database rollback are separate concerns; migrations should be designed for compatibility with deployment sequencing.
