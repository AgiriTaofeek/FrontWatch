# SDK Developer Experience

## Installation

The goal should be:

```text
install package
 ↓
initialize SDK
 ↓
deploy
 ↓
see first event
```

## Setup Verification

After initialization, the SDK should make it easy to verify:

```text
SDK loaded
Project recognized
Environment recognized
Release recognized
Telemetry delivered
```

## Debug Mode

Development-only debug output may show:

```text
event captured
event dropped
event sampled
event queued
event sent
```

Never print sensitive telemetry.

## TypeScript

The public SDK should have strong TypeScript types.

## Documentation

Every supported framework should have:

- installation
- initialization
- SSR/SSG instructions
- source maps
- privacy
- manual capture
- troubleshooting

## Errors

SDK configuration errors should be actionable.

Bad:

```text
Initialization failed
```

Better:

```text
FrontWatch project key is missing.
Add it to the client initialization configuration.
```
