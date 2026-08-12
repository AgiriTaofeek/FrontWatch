# SDK Initialization

## Basic Concept

```ts
import { init } from "@frontwatch/sdk";

init({
  dsn: "...",
  environment: "production",
  release: "2026.08.11"
});
```

The exact public API may evolve.

## Initialization Responsibilities

Initialization should:

1. Validate configuration.
2. Create SDK client.
3. Establish context.
4. Configure privacy.
5. Configure sampling.
6. Register instrumentation.
7. Start buffering/transport.
8. Start session tracking where enabled.

## Initialization Must Be Cheap

Avoid expensive synchronous work during application startup.

## Duplicate Initialization

If initialization is called multiple times, the SDK should have deterministic behavior.

Options:

```text
ignore duplicate
warn
return existing client
```

The preferred behavior should be documented.

## Configuration

Potential configuration:

```text
dsn/project key
environment
release
sample rate
privacy rules
enabled integrations
debug mode
transport
buffer limits
```

## Invalid Configuration

A bad monitoring configuration must not crash the application.

The SDK should expose diagnostic information in development without leaking secrets in production.
