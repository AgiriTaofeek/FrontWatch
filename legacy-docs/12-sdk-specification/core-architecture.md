# SDK Core Architecture

## Modules

```text
core/
├── client
├── context
├── event
├── transport
├── buffer
├── privacy
├── sampling
├── session
├── errors
├── network
├── performance
├── navigation
└── breadcrumbs
```

## Client

Owns lifecycle and configuration.

## Context

Maintains:

```text
application
environment
release
session
route
browser
device
```

## Event Builder

Converts instrumentation output into the common FrontWatch event envelope.

## Privacy Layer

Runs before transport.

```text
capture
 ↓
sanitize
 ↓
redact
 ↓
sample
 ↓
buffer
```

## Transport

Responsible for:

- batching
- compression where supported
- network requests
- retry
- backoff
- failure handling

## Buffer

Responsible for:

- queueing events
- bounded memory
- flush thresholds
- shutdown flushing

## Integrations

Instrumentation should be modular.

Examples:

```text
error integration
network integration
performance integration
navigation integration
```
