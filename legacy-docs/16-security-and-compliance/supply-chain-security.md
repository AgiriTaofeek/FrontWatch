# Supply Chain Security

## Assets

The supply chain includes:

```text
dependencies
source
build tools
base images
containers
SDK packages
Helm charts
deployment scripts
```

## Controls

Use:

- dependency scanning
- lockfiles
- secret scanning
- SBOMs
- image scanning
- artifact signing where practical
- protected release process

## SDK

The browser SDK has especially high distribution impact.

A compromised SDK release could affect many customer applications.

Therefore SDK release controls must be stricter than ordinary internal packages.
