# SDK Versioning & Release Strategy

## Versioning

Use semantic versioning where practical:

```text
MAJOR.MINOR.PATCH
```

## Breaking Changes

Examples:

- public API removal
- incompatible configuration
- event contract incompatibility
- major behavior change

## Event Schema

SDK version and event schema version are separate.

## Framework Packages

Framework adapters may share the same major/minor line while releasing independently if necessary.

## Release Channels

Potential:

```text
stable
beta
canary
```

## Compatibility

Backend should support a defined range of SDK versions.

## Rollback

SDK releases should be reversible through package version pinning.

## Changelog

Every release should clearly state:

- changes
- breaking changes
- performance impact
- privacy impact
- migration requirements
