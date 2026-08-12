# Source Maps & Stack Trace Resolution

## Problem

Production JavaScript is often:

- minified
- bundled
- transformed

Raw stack traces are therefore difficult to investigate.

## Source Map Flow

```text
Production Error
      ↓
Minified stack
      ↓
Release
      ↓
Source map
      ↓
Resolved source location
```

## Release Association

Source maps must be associated with a specific release.

## Security

Source maps can contain source code.

For banking/self-hosted environments, source maps should not be publicly exposed.

## Upload

A build/deployment process should upload source maps directly to the customer's FrontWatch instance.

## Processing

Source map resolution can happen:

```text
during ingestion
```

or:

```text
during investigation
```

The architecture should choose based on performance and privacy.

## Recommendation

Prefer storing source maps securely and resolving stack traces server-side so source maps do not need to be shipped to browsers.
