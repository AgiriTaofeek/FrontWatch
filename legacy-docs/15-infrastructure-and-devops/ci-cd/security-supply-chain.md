# CI/CD Supply Chain Security

## Controls

- dependency scanning
- container scanning
- secret scanning
- SBOM generation
- artifact signing where practical
- protected branches
- protected release tags
- least-privilege CI credentials

## SBOM

Generate an SBOM for release artifacts.

## Dependencies

Review direct and transitive dependencies plus container packages and base images.

## Secrets

CI credentials should be scoped and unavailable to untrusted pull requests where possible.

Customers should be able to verify which release artifact they deployed.
